import { Injectable } from '@nestjs/common';
import { ElasticsearchService } from 'src/prisma/connection.es';
@Injectable()
export class EsDataRetriver {
  constructor(private readonly es: ElasticsearchService) {}
  async getEsData(ids: string) {
    try {
      // const mysql = this.mysq;
      //   mysqlCo.
      console.time('es');
      // console.log('ids worker', ids);
      const es10timesdata500 = await this.es.getClient().search({
        index: 'event_v4',
        _source: [
          'id',
          'following',
          'internationalAudience',
          'eventEstimatedSize',
          'repeatSentiment',
          'reputationSentiment',
          'yoyGrowth',
          'exhibitingLeads',
          'sponsoringLeads',
          'speakingLeads',
          'avg_rating',
          'total_edition',
          'event_type_new',
          'hybrid',
          'city',
          'interested',
          'exhibitors',
          'futureExpexctedStartDate',
          'futureExpexctedEndDate',
          'inboundAudience',
        ],
        body: {
          size: 1000,
          query: {
            bool: {
              must: [
                {
                  terms: {
                    id: ids.split(','),
                  },
                },
              ],
            },
          },
        },
      });
      const rawdata = es10timesdata500.body.hits.hits;
      const dataToReturn = {};
      for (const data of rawdata) {
        dataToReturn[data['_id'] + ''] = data;
      }
      // console.log(dataToReturn);

      console.timeEnd('es');
      return dataToReturn;
    } catch (error) {
      console.error(error);

      return 'Post data retrive failed\n' + error;
    }
  }
}
