import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from 'src/prisma/connection.es';
import { PrismaMicroService } from 'src/prisma/prisma.microservice';
import { PrismaMysqlService } from 'src/prisma/prisma.mysqldbservice';
import { MysqLdata } from './worker.mysqldata';
import { MicroDataRetriver } from './worker.postgresdata';
import { EsDataRetriver } from './worker.esdata';
import * as fs from 'fs';

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
  async getDataAndCompare(query) {
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
        if (id.length < 500) breakLoop = true;

        console.log(
          'first eventId=> ',
          id.length > 0 ? id[0]?.ids : 'no Id left',
        );

        if (id.length === 0) {
          break;
        }
        console.log(query);
        const ids: string = '100009'; // id.map((val) => Number(val.ids)).join(',');
        console.log(ids);
        console.time('500 Data');
        const [mysql500data, micro, es]: [
          Record<string, EventDetails>,
          Record<string, EventDetailsMicro>,
          Record<string, EventMetrics>,
        ] = await Promise.all([
          this.dataRetriver.mysqlData(ids),
          this.dataRetriver2.getMicroserviceData(ids),
          this.dataRetriver3.getEsData(ids),
        ]);
        await this.comapre({
          esEventJson: es,
          ids: ids.split(','),
          microServiceEventJson: micro,
          tentimesEventJson: mysql500data,
        });
        console.timeEnd('500 Data');
        console.log('mysql500data');
        offset = id[id.length - 1].ids;
        console.log('last eventId=> ', offset);
        totalresultGet += id.length;

        console.log('total==> ', totalresultGet);
      }
    } catch (error) {
      console.error(error);
    }
  }
  async comapre(data: Compare) {
    try {
    } catch (error) {}
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
  id: number | null;
  yoyGrowth: number | null;
  name: string | null;
  startDateTime: Date | null;
  endDateTime: Date | null;
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
  repeatSentiment: string | null;
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
  totalexhibit: number | null;
  ownerabout: string | null;
  totalsponsor: number | null;
  totalvisitor: number | null;
  owneraddress: string | null;
  venuecountryid: number | null;
  venuecountryname: string | null;
  venuecountryregion: string | null;
  sourceId: number | null;
  venuecountrycode: string | null;
  venuecity: string | null;
  publishstatus: string | null;
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
  publish_status: boolean | null;
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
  hybrid: boolean | null;
  city: string | null;
  interested: number | null;
  exhibitors: number | null;
  futureExpexctedStartDate: Date | null;
  futureExpexctedEndDate: Date | null;
  inboundAudience: number | null;
}
