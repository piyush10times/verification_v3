import { Injectable } from '@nestjs/common';
import { PrismaMysqlService } from 'src/prisma/prisma.mysqldbservice';
@Injectable()
export class MysqLdata {
  constructor(private readonly mysql: PrismaMysqlService) {}
  async mysqlData(ids: string) {
    try {
      console.time('mysql');
      // console.log('data');

      const event500Datafrom10times = (await this.mysql.$queryRaw`SELECT
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
            e.event_type AS event_type,
            e.published AS publish_status,
            ee.visitors_total ,
            ee.exhibitors_total
          FROM
            event e
          LEFT JOIN
            event_edition ee ON e.event_edition = ee.id
          LEFT JOIN
            attachment a ON e.logo = a.id
          WHERE
            e.id IN (${ids})
             order by e.id;
          `) as EventDetails[];
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
            ee.company_id
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
            ee.event as event_id,
            ee.id AS event_edition_id,
            description.value AS description,
            timing.value AS timing,
            stats.value AS stats
          FROM
            event_edition ee
          LEFT JOIN
            event_data description ON ee.id = description.event_edition
            AND description.title = 'desc'
            AND description.value IS NOT NULL
          LEFT JOIN
            event_data timing ON ee.id = timing.event_edition
            AND timing.title = 'timing'
            AND timing.value IS NOT NULL
          LEFT JOIN
            event_data stats ON ee.id = stats.event_edition
            AND stats.title = 'stats'
            AND stats.value IS NOT NULL
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
            `)) as CompanyDetails[];
      const product = (await this.mysql.$queryRawUnsafe(`
            SELECT
          ep.event event_id,
            GROUP_CONCAT(
              DISTINCT p.name
              ORDER BY p.name ASC SEPARATOR ', '
            ) AS productname
          FROM
          event_products ep 
          left JOIN event e on ep.event=e.id and ep.edition=e.event_edition
          LEFT JOIN
            product p ON ep.product=p.id And ep.edition in (${edition500data
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
              .join(',')}) where e.id is not null and
            ep.event IN (${ids}) 
          GROUP BY
          ep.event
          order by ep.event;`)) as Product[];

      const ticket = (await this.mysql.$queryRawUnsafe(`
        SELECT
         e.id AS event_id,
         GROUP_CONCAT(DISTINCT et.type ORDER BY et.type ASC SEPARATOR ',')
          AS ticket_type
       FROM
         event e
       LEFT JOIN
         event_ticket et ON et.event = e.id
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
            GROUP BY v.id;`)) as Venue[];
      //
      const dataToReturn = {};
      // for event table
      for (const data of event500Datafrom10times) {
        dataToReturn[data?.event_id + ''] = data;
      }
      // for event edition table
      for (const data of edition500data) {
        dataToReturn[data?.event_id + ''] = {
          ...dataToReturn[data?.event_id + ''],
          ...data,
        };
      }
      // for comapny table
      for (const data of edition500data) {
        const temp = this.binarySearch(company, data?.company_id, 'company_id');
        dataToReturn[data?.event_id + ''] = {
          ...dataToReturn[data?.event_id + ''],
          ...temp,
        };
      }
      // for event edition other data table
      for (const data of editionother500data) {
        dataToReturn[data?.event_id + ''] = {
          ...dataToReturn[data?.event_id + ''],
          ...data,
        };
      }
      // for category table
      for (const data of category) {
        dataToReturn[data?.event_id + ''] = {
          ...dataToReturn[data?.event_id + ''],
          ...data,
        };
      }
      // for product table
      for (const data of product) {
        dataToReturn[data?.event_id + ''] = {
          ...dataToReturn[data?.event_id + ''],
          ...data,
        };
      }
      // for ticket table
      for (const data of ticket) {
        dataToReturn[data?.event_id + ''] = {
          ...dataToReturn[data?.event_id + ''],
          ...data,
        };
      }
      // for venue table
      // console.log(venue);

      for (const data of edition500data) {
        const temp = this.binarySearch(venue, data?.event_venue, 'venue_id');
        // console.log('vwnue', temp);

        dataToReturn[data?.event_id + ''] = {
          ...temp,
          ...dataToReturn[data?.event_id + ''],
        };
      }
      console.timeEnd('mysql');
      // console.log(dataToReturn);
      return dataToReturn;
    } catch (error) {
      console.error(error);

      return 'Mysql data retrive failed\n' + error;
    }
  }
  binarySearch(arr: any[], target: number, id: string) {
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
}
export interface EventEditionDetails {
  event_id: number | null;
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
}
export interface Editionother500data {
  event_id: number | null;
  event_edition_id: number | null;
  description: string | null;
  timing: Date | null;
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
