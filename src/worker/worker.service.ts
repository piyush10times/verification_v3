import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from 'src/prisma/connection.es';
import { PrismaMicroService } from 'src/prisma/prisma.microservice';
import { PrismaMysqlService } from 'src/prisma/prisma.mysqldbservice';
import { MysqLdata } from './worker.mysqldata';
import { MicroDataRetriver } from './worker.postgresdata';
import { EsDataRetriver } from './worker.esdata';
import * as fs from 'fs';
import { v5 } from 'uuid';

@Injectable()
export class WorkerService {
  constructor(
    private readonly mysql: PrismaMysqlService,
    private readonly post: PrismaMicroService,
    private readonly es: ElasticsearchService,
    private dataRetriver: MysqLdata,
    private dataRetriver2: MicroDataRetriver,
    private dataRetriver3: EsDataRetriver,
  ) {}
  async getDataAndCompare() {
    const fileDir: string = './logs/';
    if (fs.existsSync(fileDir)) fs.rmSync('./logs', { recursive: true });
    try {
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      // const con = await this.mysql.onModuleInit();
      const totalevent = (await this.mysql.$queryRawUnsafe(
        "SELECT count(id) id FROM event WHERE event.published IN (0,1,2) AND event.functionality = 'open' AND event.id > -1;",
      )) as { id: number }[];
      const totalNumberOfresult: number = Number(totalevent[0].id);
      const totaleventOnMicroService = (await this.post.$queryRawUnsafe(
        `SELECT count(id) id FROM "AllEvent"`,
      )) as { id: number }[];
      const countOfEVentOnMicro: number = Number(
        totaleventOnMicroService[0].id,
      );
      fs.promises.writeFile(
        fileDir + 'report.json',
        JSON.stringify({
          total_event_on_10times_db: totalNumberOfresult,
          total_event_on_MicroService_db: countOfEVentOnMicro,
          difference: totalNumberOfresult - countOfEVentOnMicro,
        }),
      );
      fs.promises.writeFile(fileDir + 'data_mismatched.txt', ``);
      await this.post.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS  Event10vsMicroMapping (
    microEventId VARCHAR(255),
    tenTimeEventId VARCHAR(255),
    sourceId VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);
      let breakLoop: boolean = false;
      const limit: number = 500;
      let offset: number = 0;
      let totalresultGet: number = 0;
      console.time('500 Data');
      while (true) {
        if (breakLoop) {
          break;
        }
        const id = (await this.mysql.$queryRawUnsafe(`
        SELECT event.id ids 
        FROM event 
        WHERE event.published IN (0,1,2) 
          AND event.functionality = 'open'
          AND event.id > ${offset}
        ORDER BY event.id ASC 
        LIMIT ${limit};
      `)) as { ids: number }[];
        if (id.length < limit) breakLoop = true;

        console.log(
          'first eventId=> ',
          id.length > 0 ? id[0]?.ids : 'no Id left',
        );

        if (id.length === 0) {
          break;
        }
        // console.log(query);
        const ids: string = id.map((val) => Number(val.ids)).join(',');
        // console.log(ids);

        const [mysql500data, micro, es]: [
          Record<string, EventDetails>,
          Record<string, EventDetailsMicro>,
          Record<string, EventMetrics>,
        ] = await Promise.all([
          this.dataRetriver.mysqlData(ids),
          this.dataRetriver2.getMicroserviceData(ids),
          this.dataRetriver3.getEsData(ids),
        ]);
        this.comapre({
          esEventJson: es,
          ids: ids.split(','),
          microServiceEventJson: micro,
          tentimesEventJson: mysql500data,
        });

        console.log('mysql500data');
        offset = id[id.length - 1].ids;
        console.log('last eventId=> ', offset);
        totalresultGet += id.length;

        console.log('total==> ', totalresultGet);
        // break;
      }
      console.timeEnd('500 Data');
      process.exit(0);
    } catch (error) {
      console.error(error);
      await fs.promises.writeFile(
        fileDir + 'error.txt',
        error + '\n' + JSON.stringify(error),
      );
      process.exit(0);
    }
  }
  async comapre(data: Compare): Promise<string> {
    try {
      const fileDir: string = './logs/';
      let data_do_not_match: string = '';
      let flagTowrite: boolean = false;
      // console.log(data?.ids.length);

      for (const element of data?.ids) {
        // await fs.writeFileSync(
        //   fileDir + "termial_print.txt",
        //   "total result from 10times-> " +
        //     Math.ceil(totalNumberOfresult) +
        //     " :: currently " +
        //     checking++ +
        //     "   @eventId--> " +
        //     element.ids
        // );
        // console.log(
        //   "total result from 10times-> " +
        //     Math.ceil(totalNumberOfresult) +
        //     " :: currently " +
        //     checking++ +
        //     "   @eventId--> " +
        //     element
        // );
        // if (tempid.length === 0) {
        //   continue;
        // }
        // element.ids = 1;
        flagTowrite = false;
        // esEventJson
        // microServiceEventJson
        // tentimesEventJson
        // console.log(element, data?.esEventJson[element + ""]);
        const event1Datafrom10times: EventDetails =
          data?.tentimesEventJson[element];
        // delete data?.tentimesEventJson[element];
        //  // console.log("microServiceData");
        const microServiceData: EventDetailsMicro =
          data?.microServiceEventJson[element];
        // delete data?.microServiceEventJson[element];
        // console.log(microServiceData);

        await this.post
          .$executeRawUnsafe(`INSERT INTO event10vsmicromapping (microEventId, tenTimeEventId, sourceId)
  VALUES ('${microServiceData?.id || null}', ${
    event1Datafrom10times?.event_id || null
  }, '${null}');`);
        if (!microServiceData) {
          console.log('microservice has no data');
          // eventIdNotFount.push(element);
          continue;
        }
        //  // console.log("es10timesdata");
        // if (
        //   !es10timesdata.body ||
        //   !es10timesdata.body.hits ||
        //   !es10timesdata.body.hits.hits
        // ) {
        //   // return [];
        // }
        const esData: EventMetrics = data?.esEventJson[element];

        // delete data?.esEventJson[element];
        // for (const d1 of esAlldata) {
        //   if (element.ids === +(d1?._source?.id ?? "-111")) {
        //     esData = d1.;
        //     esAlldata.shift();
        //     break;
        //   }
        // }
        // console.log({...event1Datafrom10times,...esData},{...microServiceData});
        // const esData = es10timesdata.body.hits.hits[0] as EventEsSource;
        data_do_not_match = '';
        data_do_not_match = `\n\nEventId at 10times-> ${element} :: EventId at MicroService-> ${microServiceData.id}: \n{`;
        if (
          microServiceData?.name !== null &&
          event1Datafrom10times?.event_name !== null &&
          microServiceData?.name?.trim() !==
            event1Datafrom10times?.event_name?.trim()
        ) {
          data_do_not_match += `\n Event name not matched`;
          flagTowrite = true;
        }
        // console.log(
        //   ' Event startdatetime not matched',
        //   // microServiceData?.startDateTime?.toISOString() !=
        //   //   event1Datafrom10times?.edition_start_date?.toISOString(),
        //   // (microServiceData?.startDateTime).toISOString() ==
        //   //   (event1Datafrom10times?.edition_start_date).toISOString(),
        //   microServiceData?.startdatetime.toISOString() !==
        //     event1Datafrom10times?.edition_start_date.toISOString(),
        // );
        if (
          microServiceData?.startdatetime !== null &&
          event1Datafrom10times?.edition_start_date !== null &&
          microServiceData?.startdatetime.toISOString() !==
            event1Datafrom10times?.edition_start_date.toISOString()
        ) {
          data_do_not_match += `\n Event startDateTime not matched`;
          flagTowrite = true;
        }
        if (
          microServiceData?.enddatetime !== null &&
          event1Datafrom10times?.edition_end_date !== null &&
          microServiceData?.enddatetime.toISOString() !==
            event1Datafrom10times?.edition_end_date.toISOString()
        ) {
          data_do_not_match += `\n Event endDateTime not matched`;
          flagTowrite = true;
        }
        if (
          (microServiceData?.website !== null ||
            event1Datafrom10times?.event_website !== null) &&
          microServiceData?.website?.trim() !=
            event1Datafrom10times?.event_website?.split('\n').join('').trim()
        ) {
          data_do_not_match += `\n Event website not matched`;
          flagTowrite = true;
        }
        if (
          (microServiceData?.logoUrl !== null ||
            event1Datafrom10times?.event_logo !== null) &&
          microServiceData?.logoUrl?.trim() !=
            event1Datafrom10times?.event_logo?.trim()
        ) {
          data_do_not_match += `\n Event logoUrl not matched`;
          flagTowrite = true;
        }
        if (
          (microServiceData?.shortDescription !== null ||
            event1Datafrom10times?.event_punchline !== null) &&
          microServiceData?.shortDescription?.trim() !=
            event1Datafrom10times?.event_punchline?.trim()
        ) {
          data_do_not_match += `\n Event shortDescription not matched`;
          flagTowrite = true;
        }
        //  // console.log(" Event shortDescription not matched");
        if (
          (microServiceData?.shortName !== null ||
            event1Datafrom10times?.event_abbr_name !== null) &&
          microServiceData?.shortName?.trim() !=
            event1Datafrom10times?.event_abbr_name?.trim()
        ) {
          data_do_not_match += `\n Event shortName not matched`;
          flagTowrite = true;
        }
        if (
          (microServiceData?.score !== null ||
            event1Datafrom10times?.event_score !== null) &&
          microServiceData?.score !== event1Datafrom10times?.event_score
        ) {
          data_do_not_match += `\n Event score not matched`;
          flagTowrite = true;
        }
        if (
          (microServiceData?.eventPageUrl !== null ||
            event1Datafrom10times?.event_url !== null) &&
          microServiceData?.eventPageUrl?.trim() !=
            event1Datafrom10times?.event_url?.trim()
        ) {
          data_do_not_match += `\n Event eventPageUrl not matched`;
          flagTowrite = true;
        }
        if (
          (microServiceData?.frequency !== null ||
            event1Datafrom10times?.event_frequency !== null) &&
          microServiceData?.frequency?.trim() !=
            event1Datafrom10times?.event_frequency?.trim()
        ) {
          data_do_not_match += `\n Event frequency not matched`;
          flagTowrite = true;
        }
        if (
          (microServiceData?.description !== null ||
            event1Datafrom10times?.description !== null) &&
          microServiceData?.description?.trim() !==
            event1Datafrom10times?.description?.trim()
        ) {
          data_do_not_match += `\n Event description not matched ${
            microServiceData?.description?.trim() +
            '  $$  ' +
            event1Datafrom10times?.description?.trim()
          }`;
          flagTowrite = true;
        }
        if (
          (microServiceData?.publishStatus !== null ||
            event1Datafrom10times?.publish_status !== null) &&
          microServiceData?.publishStatus === 1 &&
          [1, 2, 0].indexOf(event1Datafrom10times?.publish_status ?? 8) > 0
        ) {
          data_do_not_match += `\n Event publishStatus not matched`;
          flagTowrite = true;
        }
        // if (
        //   (microServiceData?.foll !== null ||
        //     esData?._source?.following !== null) &&
        //   microServiceData?.totalFollowersCount !=
        //     +(esData?._source?.following + "" ?? "-111")
        // ) {
        //   data_do_not_match += `\n Event totalFollowersCount not matched${
        //     microServiceData?.totalFollowersCount +
        //     " $$  " +
        //     +(esData?._source?.following ?? "-111")
        //   }`;
        //   flagTowrite = true;
        // }
        if (microServiceData?.audienceType !== null) {
          const audience: number =
            microServiceData?.audienceType &&
            microServiceData?.audienceType === 'B2B'
              ? 11000
              : 10100;
          const temp: number =
            event1Datafrom10times?.event_audience === null
              ? 8
              : +event1Datafrom10times?.event_audience;
          if (audience !== temp) {
            data_do_not_match += `\n Event event_audience not matched`;
            flagTowrite = true;
          }
        }
        if (
          microServiceData?.status !== null &&
          event1Datafrom10times?.event_status !== null
        ) {
          let status = '';
          const event_status: string = event1Datafrom10times?.event_status;
          if (event_status && event_status !== null)
            if (event_status === 'P') status = 'POSTPONED';
            else if (event_status === 'C') status = 'CANCELLED';
            else if (event_status === 'U') status = 'UNVERIFIED';
          if (microServiceData?.status !== status) {
            data_do_not_match += `\n Event status not matched`;
            flagTowrite = true;
          }
        }
        if (microServiceData?.format !== null) {
          let eventFormat = 'OFFLINE';

          if (esData?._id !== null) {
            const field_hybrid: number =
              esData?._source?.hybrid !== null ? esData?._source?.hybrid : -11;
            const field_city: number =
              esData?._source?.city !== null ? esData?._source?.city : -11;

            if (field_city !== null && field_city === 1) eventFormat = 'ONLINE';
            else if (field_hybrid !== null && field_hybrid === 1)
              eventFormat = 'HYBRID';
            else eventFormat = 'OFFLINE';
          }
          // console.log(
          //   microServiceData?.format,
          //   esData?._source?.hybrid,
          //   esData?._source?.city,
          // );

          if (microServiceData?.format !== eventFormat) {
            data_do_not_match += `\n Event eventFormat not matched`;
            flagTowrite = true;
          }
        }
        //  // console.log(" Event eventFormat not matched");
        // if (
        //   (microServiceData?.website !== null &&
        //     event1Datafrom10times?.event_website !== null) ||
        //   microServiceData?.website?.trim() !=
        //     event1Datafrom10times?.event_website?.split("\n").join("").trim()
        // ) {
        //   data_do_not_match += `\n Event website not matched`;
        //   flagTowrite = true;
        // }
        // console.log(event1Datafrom10times,event1Datafrom10times?.event_created);

        const create = new Date(
          event1Datafrom10times?.event_created,
        ).toISOString();
        const NAMESPACE = '27290f87-1a9e-5afe-8833-31fb5d5fc81b'; // You need to provide a namespace UUID for v5
        const name = `${event1Datafrom10times?.event_id}-${create
          .substring(0, create.length - 5)
          .replace('T', ' ')
          .replace('Z', '')}`;
        const id = v5(name, NAMESPACE);
        // console.log(
        //   'Generated UUID v5:',
        //   id,
        //   name,
        //   microServiceData.id,
        //   create
        //     .substring(0, create.length - 5)
        //     .replace('T', ' ')
        //     .replace('Z', ''),
        // );

        if (microServiceData?.id?.trim() !== id.trim()) {
          data_do_not_match += `\n Event uuid not matched`;
          flagTowrite = true;
        }
        const eventCategory =
          event1Datafrom10times?.categoryname !== null &&
          event1Datafrom10times?.categoryname !== undefined
            ? event1Datafrom10times?.categoryname?.split(',')
            : [];
        const microcategory =
          microServiceData?.category !== null &&
          microServiceData?.category !== undefined
            ? microServiceData?.category?.split(',')
            : [];
        for (const data of eventCategory ?? []) {
          let notMatch = true;
          for (const d2 of microcategory ?? []) {
            if (d2.trim() === data.trim()) notMatch = false;
          }
          if (notMatch) {
            data_do_not_match += `\n category not matched \n`;
            flagTowrite = true;
            break;
          }
        }
        if (
          (event1Datafrom10times?.companyname !== undefined &&
            microServiceData?.ownername?.trim() !== null &&
            event1Datafrom10times?.companyname?.trim() !== null) ||
          microServiceData?.ownername?.trim() !==
            event1Datafrom10times?.companyname?.trim()
        ) {
          if (
            microServiceData?.ownername?.trim() !==
            event1Datafrom10times?.companyname?.trim()
          ) {
            data_do_not_match += `\n Company name not matched ${
              microServiceData?.ownername?.trim() +
              ' && ' +
              event1Datafrom10times?.companyname?.trim()
            }`;
            flagTowrite = true;
          }
        }
        if (
          microServiceData?.ownerwebsite?.trim() !=
          event1Datafrom10times?.companywebsite?.trim()
        ) {
          data_do_not_match += `\n Company website not matched`;
          flagTowrite = true;
        }
        if (
          microServiceData?.owneraddress?.trim() !=
          event1Datafrom10times?.companyaddress?.trim()
        ) {
          data_do_not_match += `\n Company address not matched`;
          flagTowrite = true;
        }
        if (
          event1Datafrom10times?.profile !== undefined &&
          microServiceData?.ownerabout?.trim() !=
            event1Datafrom10times?.profile?.trim()
        ) {
          data_do_not_match += `\n Company about not matched ${
            microServiceData?.ownerabout?.trim() +
            ' && ' +
            event1Datafrom10times?.profile?.trim()
          }`;
          flagTowrite = true;
        }
        if (
          microServiceData?.ownerlogourl?.trim() !=
          event1Datafrom10times?.companylogo?.trim()
        ) {
          data_do_not_match += `\n Company logoUrl not matched`;
          flagTowrite = true;
        }
        if (
          microServiceData?.totalExhibit !==
          event1Datafrom10times?.total_exhibit
        ) {
          data_do_not_match += `\n Company totalExhibit not matched`;
          flagTowrite = true;
        }
        if (
          microServiceData?.totalSponsor !==
          event1Datafrom10times?.total_sponsor
        ) {
          data_do_not_match += `\n Company totalSponsor not matched`;
          flagTowrite = true;
        }
        if (
          microServiceData?.totalVisitor !==
          event1Datafrom10times?.total_visitor
        ) {
          data_do_not_match += `\n Company totalVisitor not matched`;
          flagTowrite = true;
        }
        //  // console.log(" Company totalVisitor not matched");
        if (
          event1Datafrom10times?.companycity?.trim() !=
          microServiceData?.ownercity?.trim()
        ) {
          data_do_not_match += `\n Company city not matched`;
          flagTowrite = true;
        }
        if (
          event1Datafrom10times?.companycountry !=
          microServiceData?.ownercountry?.trim()
        ) {
          data_do_not_match += `\n Company country not matched`;
          flagTowrite = true;
        }
        // //  // console.log("eventypeonMicro");
        const eventypeonMicro =
          microServiceData?.eventtype !== null
            ? microServiceData?.eventtype?.split(',')
            : [];
        const event10timestype = esData?._source?.event_type_new;
        for (const data of event10timestype ?? []) {
          let notMatch = true;
          for (const d2 of eventypeonMicro ?? []) {
            // console.log(d2, data);

            if (d2?.toLowerCase().trim() === data?.toLowerCase().trim())
              notMatch = false;
          }
          if (notMatch) {
            data_do_not_match += `\n Event type not matched`;
            flagTowrite = true;
            break;
          }
        }
        const event10timesProduct =
          event1Datafrom10times?.productname !== null &&
          event1Datafrom10times?.productname !== undefined
            ? event1Datafrom10times?.productname.split(',')
            : [];
        const eventagonMicro =
          microServiceData?.eventtag !== null &&
          microServiceData?.eventtag !== undefined
            ? microServiceData?.eventtag?.split(',')
            : [];
        for (const data of event10timesProduct ?? []) {
          let notMatch = true;
          for (const d2 of eventagonMicro ?? []) {
            if (d2.toLowerCase().trim() === data.toLowerCase().trim())
              notMatch = false;
          }
          if (notMatch) {
            data_do_not_match += `\n tag/product not matched`;
            flagTowrite = true;
            break;
          }
        }
        // if (
        //   event1Datafrom10times?.ecity?.trim() !=
        //   microServiceData?.eventcityname?.trim()
        // ) {
        //   data_do_not_match += `\n Event cityname not matched`;
        //   flagTowrite = true;
        // }
        if (
          event1Datafrom10times?.venueaddress?.trim() !=
          microServiceData?.venueaddress?.trim()
        ) {
          data_do_not_match += `\n Event venueaddress not matched`;
          flagTowrite = true;
        }
        if (
          event1Datafrom10times?.venue_name?.trim() !=
          microServiceData?.venuename?.trim()
        ) {
          data_do_not_match += `\n Event venuename not matched`;
          flagTowrite = true;
        }
        if (
          event1Datafrom10times?.ticket_type !== null &&
          microServiceData?.entryType !== null &&
          event1Datafrom10times?.ticket_type !== undefined &&
          microServiceData?.entryType !== undefined
        ) {
          const checkType: string[] =
            event1Datafrom10times?.ticket_type?.split(',') ?? [];
          let type = null;
          if (checkType.length > 1) {
            type = 'FREE_AND_PAID';
          } else if (checkType.length === 1) {
            if (checkType[0].toUpperCase() === 'FREE') {
              type = 'FREE';
            } else if (checkType[0].toUpperCase() === 'PAID') {
              type = 'PAID';
            }
          }
          if (type !== microServiceData?.entryType) {
            data_do_not_match += `\n Event entryType not matched`;
            flagTowrite = true;
          }
        }
        // if (
        //   event1Datafrom10times?.ecountry?.trim() !=
        //   microServiceData?.eventcountryname?.trim()
        // ) {
        //   data_do_not_match += `\n Event countryname not matched`;
        //   flagTowrite = true;
        // }
        // if (
        //   event1Datafrom10times?.ecity?.trim() !=
        //   microServiceData?.eventcityname?.trim()
        // ) {
        //   data_do_not_match += `\n Event city not matched`;
        //   flagTowrite = true;
        // }
        if (
          (esData?._source?.yoyGrowth !== undefined ||
            microServiceData?.yoyGrowth === 0) &&
          esData?._source?.yoyGrowth !== microServiceData?.yoyGrowth
        ) {
          if (
            esData?._source?.yoyGrowth !== undefined &&
            microServiceData?.yoyGrowth !== 0
          ) {
            data_do_not_match += `\n Event yoyGrowth not matched  ${
              esData?._source?.yoyGrowth +
              '  $$ ' +
              microServiceData?.yoyGrowth +
              ''
            }`;
            flagTowrite = true;
          }
        }
        if (
          (esData?._source?.repeatSentiment !== undefined ||
            microServiceData?.repeatSentiment === 0) &&
          esData?._source?.repeatSentiment !=
            microServiceData?.repeatSentiment + ''
        ) {
          if (
            esData?._source?.repeatSentiment !== undefined &&
            microServiceData?.repeatSentiment !== 0
          )
            data_do_not_match += `\n Event repeatSentiment not matched ${
              esData?._source?.repeatSentiment +
              '  $$ ' +
              microServiceData?.repeatSentiment +
              ''
            }`;
          flagTowrite = true;
        }
        if (
          (esData?._source?.reputationSentiment !== undefined ||
            microServiceData?.reputationSentiment === '-8989898') &&
          esData?._source?.reputationSentiment !=
            microServiceData?.reputationSentiment + ''
        ) {
          if (
            esData?._source?.reputationSentiment !== null &&
            microServiceData?.reputationSentiment !== '-888888' &&
            microServiceData?.reputationSentiment !== '0'
          )
            data_do_not_match += `\n Event reputationSentiment not matched  ${
              esData?._source?.reputationSentiment +
              '  $$  ' +
              microServiceData?.reputationSentiment +
              ''
            }`;
          flagTowrite = true;
        }
        if (
          (esData?._source?.exhibitingLeads !== undefined ||
            (microServiceData?.exhibitorsLeadCount ?? 121) === 0) &&
          esData?._source?.exhibitingLeads !==
            microServiceData?.exhibitorsLeadCount
        ) {
          if (
            esData?._source?.exhibitingLeads !== undefined &&
            microServiceData?.exhibitorsLeadCount !== 0
          )
            data_do_not_match += `\n Event exhibitingLeads not matched`;
          flagTowrite = true;
        }
        if (
          (esData?._source?.sponsoringLeads !== undefined ||
            (microServiceData?.sponsorsLeadCount ?? 545) === 0) &&
          esData?._source?.sponsoringLeads !==
            microServiceData?.sponsorsLeadCount
        ) {
          if (
            esData?._source?.sponsoringLeads !== undefined &&
            microServiceData?.sponsorsLeadCount !== 0
          )
            data_do_not_match += `\n Event sponsorsLeadCount not matched`;
          flagTowrite = true;
        }
        if (
          (esData?._source?.speakingLeads !== undefined ||
            (microServiceData?.speakersLeadCount ?? 545) === 0) &&
          esData?._source?.speakingLeads !== microServiceData?.speakersLeadCount
        ) {
          if (
            esData?._source?.speakingLeads !== undefined &&
            microServiceData?.speakersLeadCount !== 0
          )
            data_do_not_match += `\n Event speakingLeads not matched`;
          flagTowrite = true;
        }
        const fsdate =
          esData?._source?.futureExpexctedEndDate !== null &&
          esData?._source?.futureExpexctedEndDate !== undefined
            ? new Date(esData?._source?.futureExpexctedEndDate).toISOString()
            : '1885-02-25T00.00.00.000Z';
        // console.log(fsdate);
        const mfsdate =
          microServiceData?.futureExpectedEndDate !== null &&
          microServiceData?.futureExpectedEndDate !== undefined
            ? microServiceData?.futureExpectedEndDate.toISOString()
            : '1885-02-25T00.00.00.000Z';
        if (fsdate !== mfsdate) {
          data_do_not_match += `\n Event futureExpectedEndDate not matched`;
          flagTowrite = true;
        }
        const mfedate =
          microServiceData?.futureExpectedStartDate !== null &&
          microServiceData?.futureExpectedStartDate !== undefined
            ? microServiceData?.futureExpectedStartDate.toISOString()
            : '1885-02-25';
        const fedate =
          esData?._source?.futureExpexctedStartDate !== null &&
          esData?._source?.futureExpexctedStartDate !== undefined
            ? esData?._source?.futureExpexctedStartDate
            : '1885-02-25';
        // console.log(fedate, mfedate);
        if (
          new Date(fedate).toISOString() !== new Date(mfedate).toISOString()
        ) {
          data_do_not_match += `\n Event futureExpexctedStartDate not matched`;
          flagTowrite = true;
        }
        if (esData?._source?.avg_rating !== microServiceData?.averageRating) {
          if (
            esData?._source?.avg_rating !== undefined &&
            microServiceData?.averageRating + '' !== 0 + ''
          )
            data_do_not_match += `\n Event averageRating not matched  ${
              esData?._source?.avg_rating +
              ' $$ ' +
              microServiceData?.averageRating +
              ''
            }`;
          flagTowrite = true;
        }

        if (
          (esData?._source?.total_edition ?? '') !==
          (microServiceData?.editionCount ?? '')
        ) {
          data_do_not_match += `\n Event editionCount not matched`;
          flagTowrite = true;
        }
        if (
          (esData?._source?.internationalAudience ?? '') !=
          (microServiceData?.internationalAudience ?? '')
        ) {
          data_do_not_match += `\n Event internationalAudience not matched`;
          flagTowrite = true;
        }
        // if (
        //   microServiceData.estimatedExhibitorLower !== null &&
        //   microServiceData.estimatedExhibitorMean !== null &&
        //   microServiceData.estimatedExhibitorUpper !== null &&
        //   event1Datafrom10times.exhibitors_total !== null
        // ) {
        //   const { lower_bound, mean, upper_bound } = calculateExhibitorFootfall(
        //     event1Datafrom10times.exhibitors_total,
        //     event1Datafrom10times.visitors_total,
        //     +(event1Datafrom10times.event_type ?? ("-89" ))
        //   );
        //   if (
        //     microServiceData.estimatedExhibitorLower !== lower_bound &&
        //     microServiceData.estimatedExhibitorMean !== mean &&
        //     microServiceData.estimatedExhibitorUpper !== upper_bound
        //   ) {
        //     data_do_not_match += `\n Event estimatedExhibitorLower estimatedExhibitorMean estimatedExhibitorUpper not matched`;
        //     flagTowrite = true;
        //   }
        // }
        if (
          microServiceData?.estimatedExhibitorLower !== null &&
          microServiceData?.estimatedExhibitorMean !== null &&
          microServiceData?.estimatedExhibitorUpper !== null &&
          event1Datafrom10times?.exhibitors_total !== null
        ) {
          const { lower_bound, mean, upper_bound } =
            this.calculateExhibitorFootfall(
              event1Datafrom10times?.exhibitors_total ?? 0,
              event1Datafrom10times?.visitors_total ?? 0,
              +(event1Datafrom10times?.event_type ?? '-89'),
            );
          if (
            microServiceData.estimatedExhibitorLower !== lower_bound &&
            microServiceData.estimatedExhibitorMean !== mean &&
            microServiceData.estimatedExhibitorUpper !== upper_bound
          ) {
            data_do_not_match += `\n Event estimatedExhibitorLower estimatedExhibitorMean estimatedExhibitorUpper not matched`;
            flagTowrite = true;
          }
        }
        if (
          microServiceData?.estimatedVisitorLower !== null &&
          microServiceData?.estimatedVisitorMean !== null &&
          microServiceData?.estimatedVisitorUpper !== null &&
          event1Datafrom10times?.exhibitors_total !== null
        ) {
          const { lower_bound, mean, upper_bound } =
            this.calculateVisitorFootfall(
              event1Datafrom10times?.visitors_total ?? 0,
              +(esData?._source?.following || '-89'),
              +(event1Datafrom10times?.event_type ?? '-89'),
            );
          if (
            microServiceData.estimatedVisitorLower !== lower_bound &&
            microServiceData.estimatedVisitorMean !== mean &&
            microServiceData.estimatedVisitorUpper !== upper_bound
          ) {
            data_do_not_match += `\n Event estimatedVisitorLower estimatedVisitorMean estimatedVisitorUpper not matched`;
            flagTowrite = true;
          }
        }
        if (flagTowrite)
          await fs.promises.appendFile(
            fileDir + 'data_mismatched.txt',
            `${data_do_not_match},\n}`,
          );
        // break;
      }
      return 'done';
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
  calculateVisitorFootfall(
    visitorsCountByOrganizer,
    visitor_leads,
    event_type_source_id,
  ) {
    try {
      const visitorsCount =
        visitorsCountByOrganizer !== null ? visitorsCountByOrganizer : null;
      const leads = visitor_leads !== null ? visitor_leads : 0;
      const eventType =
        event_type_source_id !== null ? event_type_source_id : null;

      let upper_bound = 0;
      let lower_bound = 0;
      let mean = 0;

      if (visitorsCount !== null && visitorsCount > 0) {
        upper_bound = visitorsCount;
        lower_bound = visitorsCount;
      } else {
        if (eventType === 1) {
          if (leads === 0) {
            upper_bound = 1000;
            lower_bound = 0;
          } else if (leads >= 1 && leads <= 25) {
            upper_bound = 5000;
            lower_bound = 1000;
          } else if (leads >= 26 && leads <= 100) {
            upper_bound = 20000;
            lower_bound = 5000;
          } else if (leads >= 101 && leads <= 500) {
            upper_bound = 50000;
            lower_bound = 20000;
          } else if (leads >= 501 && leads <= 5000) {
            upper_bound = 200000;
            lower_bound = 50000;
          } else {
            upper_bound = 500000;
            lower_bound = 200000;
          }
        } else {
          if (leads === 0) {
            upper_bound = 100;
            lower_bound = 0;
          } else if (leads >= 1 && leads <= 25) {
            upper_bound = 500;
            lower_bound = 100;
          } else if (leads >= 26 && leads <= 100) {
            upper_bound = 1000;
            lower_bound = 500;
          } else if (leads >= 101 && leads <= 500) {
            upper_bound = 5000;
            lower_bound = 2000;
          } else {
            upper_bound = 10000;
            lower_bound = 5000;
          }
        }
      }

      mean = Math.floor((upper_bound + lower_bound) / 2);

      return {
        upper_bound,
        lower_bound,
        mean,
      };
    } catch (error) {
      throw new Error(error);
    }
  }
  calculateExhibitorFootfall(
    exhibitorsCountByOrganizer,
    visitor_leads,
    event_type_source_id,
  ) {
    try {
      const exhibitorsCount =
        exhibitorsCountByOrganizer !== null ? exhibitorsCountByOrganizer : null;
      const leads = visitor_leads !== null ? visitor_leads : 0;
      const eventType =
        event_type_source_id !== null ? event_type_source_id : null;

      let upper_bound = 0;
      let lower_bound = 0;
      let mean = 0;

      if (exhibitorsCount !== null && exhibitorsCount >= 0) {
        upper_bound = exhibitorsCount;
        lower_bound = exhibitorsCount;
      } else {
        if (eventType === 1) {
          if (leads === 0) {
            upper_bound = 100;
            lower_bound = 20;
          } else if (leads >= 1 && leads <= 100) {
            upper_bound = 500;
            lower_bound = 100;
          } else {
            upper_bound = 1000;
            lower_bound = 500;
          }
        } else {
          upper_bound = null;
          lower_bound = null;
        }
      }

      if (upper_bound === null && lower_bound === null) {
        mean = null;
      } else {
        mean =
          upper_bound !== null && lower_bound !== null
            ? Math.floor((upper_bound + lower_bound) / 2)
            : null;
      }

      return {
        upper_bound,
        lower_bound,
        mean,
      };
    } catch (error) {
      throw new Error(error);
    }
  }
}
export interface Compare {
  esEventJson?: Record<string, EventMetrics>;
  ids?: string[];
  microServiceEventJson?: Record<string, EventDetailsMicro>;
  tentimesEventJson?: Record<string, EventDetails>;
}
export interface EventDetailsMicro {
  id: string | null;
  yoyGrowth: number | null;
  name: string | null;
  startdatetime: Date | null;
  enddatetime: Date | null;
  website: string | null;
  bannerUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  shortDescription: string | null;
  shortName: string | null;
  status: string | null;
  maturity: string | null;
  localTimezone: string | null;
  isForcasted: boolean | null;
  eventRank: number | null;
  localRank: number | null;
  aviationRank: number | null;
  totalEstimatedAttendanceByOrganizer: number | null;
  internationalAudience: number | null;
  localAudience: number | null;
  score: number | null;
  orgPriceLink: string | null;
  inboundScore: number | null;
  createdAt: Date | null;
  internationalScore: number | null;
  eventImpactScore: number | null;
  exhibitorsLeadCount: number | null;
  sponsorsLeadCount: number | null;
  speakersLeadCount: number | null;
  totalFollowersCount: number | null;
  socialMediaLinks: string | null;
  eventPageUrl: string | null;
  frequency: string | null;
  entryType: string | null;
  frequencyAccuracy: string | null;
  reputationScore: number | null;
  repeatSentiment: number | null;
  reputationSentiment: string | null;
  format: string | null;
  averageRating: number | null;
  editionCount: number | null;
  ownerId: number | null;
  audienceType: string | null;
  ownerSourceId: number | null;
  venueLocationId: number | null;
  eventIPId: number | null;
  keywords: string | null;
  estimatedVisitorUpper: number | null;
  estimatedVisitorLower: number | null;
  estimatedVisitorMean: number | null;
  estimatedExhibitorUpper: number | null;
  estimatedExhibitorLower: number | null;
  estimatedExhibitorMean: number | null;
  futureExpectedStartDate: Date | null;
  futureExpectedEndDate: Date | null;
  venuename: string | null;
  venueaddress: string | null;
  venuelatitude: number | null;
  venuelongitude: number | null;
  venuecityId: number | null;
  venuecountry: string | null;
  category: string | null;
  eventtype: string | null;
  eventtag: string | null;
  ownername: string | null;
  ownerwebsite: string | null;
  ownerlogourl: string | null;
  ownerlocationid: number | null;
  totalExhibit: number | null;
  ownerabout: string | null;
  totalSponsor: number | null;
  totalVisitor: number | null;
  owneraddress: string | null;
  venuecountryid: number | null;
  venuecountryname: string | null;
  venuecountryregion: string | null;
  sourceId: number | null;
  venuecountrycode: string | null;
  venuecity: string | null;
  publishStatus: number | null;
  ownercity: string | null;
  ownerstate: string | null;
  ownercountry: string | null;
  venuestate: string | null;
  eventcityname: string | null;
  eventcountryname: string | null;
  eventstatename: string | null;
}
export interface EventDetails {
  event_id: number | null;
  event_city: string | null;
  event_punchline: string | null;
  event_name: string | null;
  event_abbr_name: string | null;
  event_logo: string | null;
  event_website: string | null;
  event_url: string | null;
  event_start_date: Date | null;
  event_end_date: Date | null;
  event_status: string | null;
  event_score: number | null;
  event_audience: number | null;
  event_frequency: string | null;
  event_created: Date | null;
  event_modified: Date | null;
  event_brand_id: number | null;
  event_type: string | null;
  publish_status: number | null;
  visitors_total: number | null;
  exhibitors_total: number | null;
  event_edition_id: number | null;
  event_facebook_id: string | null;
  event_linkedin_id: string | null;
  event_twitter_id: string | null;
  event_twitter_hashtag: string | null;
  event_google_id: string | null;
  edition_website: string | null;
  edition_start_date: Date | null;
  edition_end_date: Date | null;
  event_venue: number | null;
  company_id: number | null;
  description: string | null;
  timing: Date | null;
  stats: string | null;
  categoryname: string | null;
  companyname: string | null;
  companywebsite: string | null;
  companycity: string | null;
  companycountry: string | null;
  companyaddress: string | null;
  facebook_id: string | null;
  linkedin_id: string | null;
  twitter_id: string | null;
  profile: string | null;
  companylogo: string | null;
  companycreated: Date | null;
  total_exhibit: number | null;
  total_visitor: number | null;
  total_sponsor: number | null;
  productname: string | null;
  venue_id: number | null;
  venue_name: string | null;
  venueaddress: string | null;
  ecity: string | null;
  ecountry: string | null;
  ticket_type: string | null;
}
export interface EventMetrics {
  _index: string | null;
  _type: string | null;
  _id: string | null;
  _score: string | null;
  _source: {
    id: number | null;
    following: number | null;
    internationalAudience: number | null;
    eventEstimatedSize: number | null;
    repeatSentiment: string | null;
    reputationSentiment: string | null;
    yoyGrowth: number | null;
    exhibitingLeads: number | null;
    sponsoringLeads: number | null;
    speakingLeads: number | null;
    avg_rating: number | null;
    total_edition: number | null;
    event_type_new: string | null;
    hybrid: number | null;
    city: number | null;
    interested: number | null;
    exhibitors: number | null;
    futureExpexctedStartDate: Date | null;
    futureExpexctedEndDate: Date | null;
    inboundAudience: number | null;
  };
}
