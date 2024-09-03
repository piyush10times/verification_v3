import { Injectable } from '@nestjs/common';
import { PrismaMysqlService } from 'src/prisma/prisma.mysqldbservice';
import * as _ from 'lodash';
@Injectable()
export class MysqLdata {
  constructor(private readonly mysql: PrismaMysqlService) {}
  async mysqlData(ids: string): Promise<any> {
    try {
      console.time('mysql');
      // console.log('ids',ids);
      //  event_type_event ->
      const event500Datafrom10times = (await this.mysql.$queryRawUnsafe(`SELECT
            e.id AS event_id,
            e.city AS event_city,
            e.punchline AS event_punchline,
            e.name AS event_name,
            e.abbr_name AS event_abbr_name,
            a.cdn_url AS event_logo,
            e.website AS event_website,
            e.url AS event_url,
            e.start_date AS event_start_date,
            e.end_date AS event_end_date,
            e.status AS event_status,
            e.score AS event_score,
            e.event_audience AS event_audience,
            e.frequency AS event_frequency,
            e.created AS event_created,
            e.modified AS event_modified,
            e.brand_id AS event_brand_id,
            e.published AS publish_status,
            ee.visitors_total ,
            ee.exhibitors_total,
             '-1' as event_type,
             e.event_type as type
          FROM
            event e
          LEFT JOIN
            event_edition ee ON e.event_edition = ee.id
          LEFT JOIN
            attachment a ON e.logo = a.id
          WHERE
            e.id IN (${ids})
             order by e.id;
          `)) as EventDetails[];
      // console.log(event500Datafrom10times);
      const edition500data = (await this.mysql.$queryRawUnsafe(`
                SELECT
          e.id as event_id,
            ee.id AS event_edition_id,
            ee.facebook_id AS event_facebook_id,
            ee.linkedin_id AS event_linkedin_id,
            ee.twitter_id AS event_twitter_id,
            ee.twitter_hashtag AS event_twitter_hashtag,
            ee.google_id AS event_google_id,
            ee.website AS edition_website,
            ee.start_date AS edition_start_date,
            ee.end_date AS edition_end_date,
            ee.venue AS event_venue ,
            ee.company_id as cpid
          FROM
            event_edition ee
        left  JOIN
            event e ON e.event_edition = ee.id
            WHERE
            e.id IN (${ids})
            order by e.id
                `)) as EventEditionDetails[];
      const editionother500data = (await this.mysql.$queryRawUnsafe(`
                  SELECT
            e.id as event_id,
            ee.id AS event_edition_id,
            description.value AS description,
            'timing.value' AS timing,
            'stats.value' AS stats
          FROM
          event e 
          LEFT JOIN  event_edition ee on e.event_edition= ee.id 
          LEFT JOIN
            event_data description ON ee.id = description.event_edition And e.id = description.event
            AND description.title = 'desc'
            AND description.value IS NOT NULL
            where  e.id in (${ids})
            order by ee.event`)) as Editionother500data[];
      const category = (await this.mysql.$queryRawUnsafe(`
                SELECT
            e.id AS event_id,
            GROUP_CONCAT(
              DISTINCT cat.name
              ORDER BY cat.name ASC SEPARATOR ','
            ) AS categoryname
          FROM
            event e
          LEFT JOIN
            event_category ec ON e.id = ec.event
          LEFT JOIN
            category cat ON ec.category = cat.id
          WHERE
            e.id IN (${ids})
          GROUP BY
            e.id
            order by   e.id;`)) as Category[];
      const company = (await this.mysql.$queryRawUnsafe(`
              SELECT distinct
            c.id AS company_id,
            c.name AS companyname,
            c.website AS companywebsite,
            c_city.name AS companycity,
            c_country.name AS companycountry,
            c.address AS companyaddress,
            c.facebook_id,
            c.linkedin_id,
            c.twitter_id,
            c.profile,
            ca.cdn_url AS companylogo,
            c.created AS companycreated,
            c.total_exhibit,
            c.total_visitor,
            c.total_sponsor
          FROM
            company c
              inner JOIN
            event_edition ee ON c.id = ee.company_id
          LEFT JOIN
            city c_city ON c.city = c_city.id
          LEFT JOIN
            country c_country ON c.country = c_country.id
          LEFT JOIN
            attachment ca ON c.logo = ca.id
               WHERE
            ee.id IN (${edition500data
              .map((val) => {
                if (
                  val?.event_edition_id !== null &&
                  val?.event_edition_id !== undefined
                ) {
                  return val?.event_edition_id;
                }
                return -11;
              })
              .filter((val) => val !== -11)
              .join(',')})
              order by c.id `)) as CompanyDetails[];
      const product = (await this.mysql.$queryRawUnsafe(`
            select e.id,GROUP_CONCAT(DISTINCT p.name  SEPARATOR ',') AS productname
          FROM event e
          left JOIN event_products ep  on e.id=ep.event and e.event_edition= ep.edition and ep.published = 1
          LEFT JOIN
            product p ON ep.product=p.id 
			where e.id in (${ids}) 
          GROUP BY
          e.id`)) as Product[];

      const ticket = (await this.mysql.$queryRawUnsafe(`
        SELECT
         e.id AS event_id,
         GROUP_CONCAT(DISTINCT et.type ORDER BY et.type ASC SEPARATOR ',')
          AS ticket_type
      from event e left join event_edition ee 
      on e.event_edition = ee.id 
      left join event_ticket et on e.id = et.event and ee.id = et.edition
       WHERE
         e.id IN (${ids})
       GROUP BY
         e.id
         order by e.id;`)) as Ticket[];
      const venue = (await this.mysql.$queryRawUnsafe(`
            SELECT
            v.id AS venue_id,
            v.name as venue_name,
            v.address AS venueaddress,
            ecity.name AS ecity,
            ecountry.name AS ecountry
          FROM
            venue v
            left JOIN event_edition ee on v.id =ee.venue
and            ee.id IN (${edition500data
        .map((val) => {
          if (
            val?.event_edition_id !== null &&
            val?.event_edition_id !== undefined
          ) {
            return val?.event_edition_id;
          }
          return -11;
        })
        .filter((val) => val !== -11)
        .join(',')})
                        LEFT JOIN
            country ecountry ON v.country = ecountry.id
               LEFT JOIN
            city ecity ON v.city = ecity.id 
            where ee.id is not null
            GROUP BY ee.event;`)) as Venue[];

      const eventType = await this.mysql.event_type.findMany({
        select: {
          id: true,
          name: true,
        },
      });

      const eventTypeRecord: Record<string, string> = {};
      for (const data of eventType) {
        eventTypeRecord[data.id + ''] = data.name;
      }
      // Create Maps for fast lookups
      const companyMap = new Map<number, CompanyDetails>();
      for (const comp of company) {
        if (comp.company_id !== null && comp.company_id !== undefined) {
          companyMap.set(comp.company_id, comp);
        }
      }

      const venueMap = new Map<number, Venue>();
      for (const ven of venue) {
        if (ven.venue_id !== null && ven.venue_id !== undefined) {
          venueMap.set(ven.venue_id, ven);
        }
      }
      const typemap = (await this.mysql
        .$queryRawUnsafe(`SELECT event_id, GROUP_CONCAT(eventtype_id SEPARATOR ',') typenum
      FROM event_type_event
      where event_id in (${ids}) and published =1
      GROUP BY
          event_id 
`)) as { event_id: number; typenum: string }[];
      // Initialize dataToReturn with event data
      const dataToReturn: Record<string, EventDetails> = {};
      for (const event of event500Datafrom10times) {
        let alltypeid: string = '';
        for (const data of typemap) {
          if (event.event_id === data.event_id) {
            alltypeid = data.typenum;
            break;
          }
        }
        let temp: string[] = [];
        for (const map of alltypeid.split(',')) {
          if (eventTypeRecord[map]) temp.push(eventTypeRecord[map]);
        }
        dataToReturn[event.event_id + ''] = {
          ...event,
        };
        if (temp.length > 0) {
          dataToReturn[event.event_id + ''].event_type = temp.join(',');
        }
      }

      // Merge event edition data
      for (const edition of edition500data) {
        const eventKey = edition.event_id + '';
        if (dataToReturn[eventKey]) {
          await this.mergeData(dataToReturn[eventKey], edition);
        }
      }

      // Merge edition other data
      for (const other of editionother500data) {
        const eventKey = other.event_id + '';
        if (dataToReturn[eventKey]) {
          await this.mergeData(dataToReturn[eventKey], other);
        }
      }

      // Merge category data
      for (const cat of category) {
        const eventKey = cat.event_id + '';
        if (dataToReturn[eventKey]) {
          dataToReturn[eventKey]['categoryname'] = cat.categoryname;
        }
      }

      // Merge product data
      for (const prod of product) {
        const eventKey = prod.event_id + '';
        if (dataToReturn[eventKey]) {
          dataToReturn[eventKey]['productname'] = prod.productname;
        }
      }

      // Merge ticket data
      for (const tick of ticket) {
        const eventKey = tick.event_id + '';
        if (dataToReturn[eventKey]) {
          dataToReturn[eventKey]['ticket_type'] = tick.ticket_type;
        }
      }

      // Merge venue data
      for (const edition of edition500data) {
        const eventKey = edition.event_id + '';
        const venueData = venueMap.get(edition.event_venue || -1);
        if (venueData && dataToReturn[eventKey]) {
          await this.mergeData(dataToReturn[eventKey], venueData);
        }
      }
      // Merge company data
      for (const edition of edition500data) {
        const eventKey = edition.event_id + '';
        const companyData = companyMap.get(edition.cpid || -1);
        if (companyData && dataToReturn[eventKey]) {
          await this.mergeData(dataToReturn[eventKey], companyData);
        }
      }
      for (const data of event500Datafrom10times) {
        if (
          dataToReturn[data.event_id + ''].company_id !== null &&
          dataToReturn[data.event_id + ''].companyname === null
        ) {
          dataToReturn[data.event_id + ''].company_id = null;
        }
      }
      console.timeEnd('mysql');
      // console.log(dataToReturn);
      return dataToReturn as Record<string, EventDetails>;
    } catch (error) {
      console.error(error);

      return { 'Mysql data retrive failed\n': error };
    }
  }
  private mergeData(target: any, source: any): any {
    return _.merge(target, source);
  }

  async binarySearch(arr: any[], target: number, id: string) {
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);

      if (arr[mid][id] === target) {
        return arr[mid];
      } else if (arr[mid][id] < target) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return {};
  }
}
export interface EventDetails {
  event_id: number | null;
  event_city: string | null;
  type: number | null;
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
}
export interface EventEditionDetails {
  event_id: number | null;
  cpid: number | null;
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
}
export interface Editionother500data {
  event_id: number | null;
  event_edition_id: number | null;
  description: string | null;
  timing: string | null;
  stats: string | null;
}
export interface Category {
  event_id: number | null;
  categoryname: string | null;
}
export interface CompanyDetails {
  company_id: number | null;
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
}
export interface Product {
  event_id: number | null;
  productname: string | null;
}
export interface Venue {
  venue_id: number | null;
  venue_name: string | null;
  venueaddress: string | null;
  ecity: string | null;
  ecountry: string | null;
}
export interface Ticket {
  event_id: number | null;
  ticket_type: string | null;
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
