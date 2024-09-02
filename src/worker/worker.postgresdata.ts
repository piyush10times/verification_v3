import { Injectable } from '@nestjs/common';
import { PrismaMicroService } from 'src/prisma/prisma.microservice';
@Injectable()
export class MicroDataRetriver {
  constructor(private readonly post: PrismaMicroService) {}
  async getMicroserviceData(ids: string) {
    try {
      // const mysql = this.mysq;
      //   mysqlCo.
      console.time('post');
      const microService500Data = (await this.post.$queryRawUnsafe(
        `SELECT
    e."id",
    e."yoyGrowth",
    e."name",
    DATE (e."startDateTime") STARTDATETIME,
    DATE (e."endDateTime") ENDDATETIME,
    e."website",
    e."bannerUrl",
    e."logoUrl",
    e."description",
    e."shortDescription",
    e."shortName",
    e."status"::TEXT,
    e."maturity",
    e."localTimezone",
    e."isForcasted",
    e."eventRank",
    e."localRank",
    e."aviationRank",
    e."totalEstimatedAttendanceByOrganizer",
    e."internationalAudience",
    e."localAudience",
    e."score",
    e."orgPriceLink",
    e."inboundScore",
    e."createdAt",
    e."internationalScore",
    e."eventImpactScore",
    e."exhibitorsLeadCount",
    e."sponsorsLeadCount",
    e."speakersLeadCount",
    e."totalFollowersCount",
    e."socialMediaLinks",
    e."eventPageUrl",
    e."frequency",
    e."entryType",
    e."frequencyAccuracy",
    e."reputationScore",
    e."repeatSentiment",
    e."reputationSentiment",
    e."format"::TEXT,
    e."averageRating",
    e."editionCount",
    e."ownerId",
    e."audienceType",
    e."ownerSourceId",
    e."venueLocationId",
    e."eventIPId",
    e."keywords",
    e."estimatedVisitorUpper",
    e."estimatedVisitorLower",
    e."estimatedVisitorMean",
    e."estimatedExhibitorUpper",
    e."estimatedExhibitorLower",
    e."estimatedExhibitorMean",
    e."futureExpectedStartDate",
    e."futureExpectedEndDate",
    l1."name" AS VENUENAME,
    l1."address" AS VENUEADDRESS,
    l1."latitude" AS VENUELATITUDE,
    l1."longitude" AS VENUELONGITUDE,
    l1."cityId" AS VENUECITYID,
    l1."countryId" AS VENUECOUNTRY,
    STRING_AGG(
    DISTINCT COALESCE(cat.name, ''),
    ','
    ) AS CATEGORY,
    STRING_AGG(
    DISTINCT COALESCE(et.name, ''),
    ','
    ) AS EVENTTYPE,
    STRING_AGG(
    DISTINCT COALESCE(tg.name, ''),
    ','
    ) AS EVENTTAG,
     e."ownerSourceId" AS ownerscourceid,
    C."name" AS OWNERNAME,
    C."website" AS OWNERWEBSITE,
    C."logoUrl" AS OWNERLOGOURL,
    C."locationId" AS OWNERLOCATIONID,
    C."totalExhibit",
    C.about as ownerabout,
    C."totalSponsor",
    C."totalVisitor",
    C.address as owneraddress,
    venuecountry."id" as venuecountryid,
    venuecountry."name" as venuecountryname,
    ARRAY_TO_STRING(
    venuecountry."regions",
    ',',
    ''
    ) as venuecountryregion,
    e."sourceId",
    venuecountry."id_10x" as venuecountrycode,
    venuecity.name venuecity,
    e."publishStatus",
    c_city.name ownercity,
    c_state.name ownerstate,
    c_country.name ownercountry,
    venuestate.name venuestate,
    ecity.name eventcityname,
    ecountry.name eventcountryname,
    estate.name eventstatename
    FROM
    "AllEvent" e
    left JOIN "Location" ecity ON e."venueLocationId" = ecity.id
    and ecity."locationType" = 'CITY'
    left JOIN "Location" estate on ecity."stateId" = estate.id
    and estate."locationType" = 'STATE'
    left JOIN "Location" ecountry on ecity."countryId" = ecountry.id OR e."venueLocationId"=ecountry.id
    and ecountry."locationType" = 'COUNTRY'
    LEFT JOIN "Company" C ON e."ownerId" = C."id"
    left JOIN "Location" c_city ON c."locationId" = c_city.id
    and c_city."locationType" = 'CITY'
    left JOIN "Location" c_state on c_city."stateId" = c_state.id
    and c_state."locationType" = 'STATE'
    left JOIN "Location" c_country on c_city."countryId" = c_country.id
    OR c."locationId" = c_country.id
    and c_country."locationType" = 'COUNTRY'
    left JOIN "Location" l1 ON e."venueLocationId" = l1."id"
    AND l1."locationType" IN ('VENUE')
    LEFT JOIN "Location" venuecountry ON l1."countryId" = venuecountry."id"
    AND venuecountry."locationType" IN ('COUNTRY')
    left join "Location" venuecity on l1."cityId" = venuecity.id
    ANd venuecity."locationType" = 'CITY'
    left join "Location" venuestate on venuecity."stateId" = venuestate.id
    ANd venuecity."locationType" = 'STATE'
    left join "_AllEventToEventType" b on e.id = b."A"
    LEFT JOIN "EventType" et on b."B" = et.id
    left JOIN "_AllEventToCategory" ec on e.id = ec."A"
    LEFT join "Category" cat on ec."B" = cat.id
    left JOIN "_AllEventToTag" at on e.id = at."A"
    left JOIN "Tag" tg on at."B" = tg.id
    WHERE
    e."sourceId" in(${ids})
    GROUP BY
    e.id,
    l1.name,
    l1.address,
    l1."latitude",
    l1."longitude",
    l1."cityId",
    l1."countryId",
    C."name",
    C."website",
    C.about,
    C."logoUrl",
    C."locationId",
    C."totalExhibit",
    C."totalSponsor",
    C."totalVisitor",
    venuecountry."id",
    venuecountry."name",
    venuecountry."id_10x",
    venuecity.name,
    C.address,
    c_city.name,
    c_state.name,
    c_country.name,
    venuestate.name ,
    ecity.name ,
    ecountry.name ,
    estate.name ;`,
      )) as EventDetails[];
      const dataToReturn = {};
      for (const data of microService500Data) {
        dataToReturn[data?.sourceId] = data;
      }
      console.timeEnd('post');
      return dataToReturn;
    } catch (error) {
      console.error(error);

      return 'Post data retrive failed\n' + error;
    }
  }
}
export interface EventDetails {
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
  ownerscourceid: number | null;
}
