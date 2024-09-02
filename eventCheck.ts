import { main } from "./conecctionmysql";
import { mainEs, mainPost } from "./connectionpostgres";
// import { v5 as uuidv5, v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import path from "path";
// import { Client } from "@elastic/elasticsearch";

async function connectionToAll() {
  // const { connection } = require("./connection.10timesDb.js");
  // const { microConnection } = require("./connection.microservice.js");
  // const { esConnection } = require("./connection.es.js");
  const mysql = await main();
  const post = await mainPost();
  // const es = await esConnection();
  return { mysql: mysql, post: post };
}

export async function event() {
  const fileDir = "./logs/";
  if (fs.existsSync(fileDir)) fs.rmSync("./logs", { recursive: true });
  try {
    const fileDir = "./logs/";
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    const { mysql, post } = await connectionToAll();
    // const AllConnection = require("./common.connection");
    // const start = new AllConnection();
    // await start.initial();
    // const mysql = AllConnection.mysql;
    // const post = AllConnection.post;
    const totalevent = (await mysql.$queryRawUnsafe(
      "SELECT count(id) id FROM event WHERE event.published IN (0,1,2) AND event.functionality = 'open' AND event.id > -1;"
    )) as { id: number }[];
    const totalNumberOfresult: number = Number(totalevent[0].id);
    const totaleventOnMicroService = (await post.$queryRawUnsafe(
      `SELECT count(id) id FROM "AllEvent"`
    )) as { id: number }[];
    const countOfEVentOnMicro: number = Number(totaleventOnMicroService[0].id);
    fs.promises.writeFile(
      fileDir + "report.json",
      JSON.stringify({
        total_event_on_10times_db: totalNumberOfresult,
        total_event_on_MicroService_db: countOfEVentOnMicro,
        difference: totalNumberOfresult - countOfEVentOnMicro,
      })
    );
    // post.$disconnect();
    fs.writeFileSync(
      fileDir + "data_mismatched.csv",
      "10Times_Event_Id,MicroServiceId,Do_Not_Match,10times_data,MicroserviceData,Es_data,\n",
      "utf-8"
    );
    // //  // console.log("totalNumberOfresult==> ", totalNumberOfresult);
    let limit: number = 500;
    let offset: number = 0;
    let totalresultGet: number = 0;
    const totalData10timesvsMicroTbale = await post.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS  Event10vsMicroMapping (
    microEventId VARCHAR(255),
    tenTimeEventId VARCHAR(255),
    sourceId VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`);
    const { dataWorker } = require("./worker.assign");
    const { taskAssigner } = require("./worker.taskassigner");
    // const threads: number = +(process.env.THREAD ?? "1");
    let breakLoop: boolean = false;
    let workerOn: number = 0;
    // const ThreadPool = require("./thread.pool");
    // const pool = new ThreadPool(2, 2);
    while (true) {
      if (breakLoop) {
        break;
      }
      workerOn++;
      // Fetch event IDs in batches of 500
      const event500Datafrom10times = (await mysql.$queryRawUnsafe(`
        SELECT event.id ids 
        FROM event 
        WHERE event.published IN (0,1,2) 
          AND event.functionality = 'open'
          AND event.id > ${offset} 
        ORDER BY event.id ASC 
        LIMIT 500;
      `)) as { ids: number }[];

      if (event500Datafrom10times.length < 500) breakLoop = true;

      console.log(
        "first eventId=> ",
        event500Datafrom10times.length > 0
          ? event500Datafrom10times[0]?.ids
          : "no Id left"
      );

      if (event500Datafrom10times.length === 0) {
        break;
      }

      const ids10times: number[] = event500Datafrom10times.map(
        (val) => val.ids
      );
      // await pool.addTask(ids10times);
      const [
        event1000Datafrom10times1,
        event1000DatafromMicroservice1,
        es10timesdata500,
      ] = await Promise.all([
        dataWorker(
          ids10times,
          path.resolve(__dirname, "worker.tentimesDb500.js")
          // { con: { ...mysql } }
        ),
        dataWorker(
          ids10times,
          path.resolve(__dirname, "worker.microservice500.js")
          // { con: { ...post } }
        ),
        dataWorker(ids10times, path.resolve(__dirname, "worker.es500.js"), {
          // con: { ...es },
        }),
      ]);
      // console.timeEnd("db");
      taskAssigner({
        esEventJson: { ...es10timesdata500 },
        ids: ids10times,
        microServiceEventJson: { ...event1000DatafromMicroservice1 },
        tentimesEventJson: { ...event1000Datafrom10times1 },
      });
      // console.log("fetching data from 10times db");
      // console.log("fetching data from MIcro Serice db");
      // console.log("fetching data from 10times ES");
      // console.time("db");
      offset = event500Datafrom10times[event500Datafrom10times.length - 1].ids;
      console.log("last eventId=> ", offset);
      totalresultGet += event500Datafrom10times.length;

      console.log("total==> ", totalresultGet);
      // console.timeEnd("innerloop");      break;
    }
    // await AllConnection.destroy();
    // pool.destroy();
    console.log("All tasks completed.");
    //     const eventIdsholdnotBeINMicroService = (await post.$queryRawUnsafe(
    //       `
    //       select a.id
    // from "AllEvent" a
    //     left join public.event10vsmicromapping temp on a.id = temp.microeventid
    // where
    //     temp.microeventid is null
    //       `
    //     )) as { id?: string }[];
    // if (eventIdsholdnotBeINMicroService.length > 0)
    //   await fs.promises.writeFile(
    //     fileDir + "eventreportinmicroservice.txt",
    //     JSON.stringify({
    //       event_present_in_microservice_but_not_in_10times: {
    //         event_ids_of_Microservice: eventIdsholdnotBeINMicroService,
    //       },
    //     })
    //   );
    // const deleteEventmappingfrommicro =
    //   await post.$executeRawUnsafe(`DROP TABLE event10vsmicromapping;
    // `);
    // console.log("event id no found=> ", eventIdNotFount);
    mysql.$disconnect();
    post.$disconnect();
    console.log("connection disconnected");
  } catch (error) {
    // console.log(error);
    console.error(error);
    const fileDir = "./logs/";
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    await fs.promises.writeFile(
      fileDir + "error.txt",
      error + "\n" + JSON.stringify(error)
    );
    // //  // console.log(error + "");
    // console.error(error);
  }
}
