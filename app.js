const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let dataBase = null;

const initializeDbAndServer = async () => {
  try {
    dataBase = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(4000, () => {
      console.log("Server Up And Running");
    });
  } catch (error) {
    console.log(`DB ERROR: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertStateObjToResponsiveObj = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictObjToResponsiveObj = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getSate = `
    select * from state;
    `;
  const satesTable = await dataBase.all(getSate);
  response.send(
    satesTable.map((eachState) => convertStateObjToResponsiveObj(eachState))
  );
});

app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const stateIdQuery = `
    select * from state where state_id = ${stateId};
    `;
  const stateIdTable = await dataBase.get(stateIdQuery);
  response.send(convertStateObjToResponsiveObj(stateIdTable));
});

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;

  const createRow = `
    INSERT INTO district ( district_name, state_id, cases, cured, active, deaths)
    VALUES(
        '${districtName}',
        ${stateId},
        ${cases},
        ${cured},
        ${active},
        ${deaths}
    );`;
  await dataBase.run(createRow);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrict = `
        select * from district where district_id = ${districtId};`;
  const districtDetails = await dataBase.get(getDistrict);
  response.send(convertDistrictObjToResponsiveObj(districtDetails));
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const removeDistrict = `
    DELETE FROM district 
    where district_id = ${districtId};
    `;
  await dataBase.run(removeDistrict);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const updateDetails = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = updateDetails;
  const updateQuery = `
  update district set
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths};
  `;
  await dataBase.run(updateQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const TotalGetQuery = `
     SELECT
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM
      district
    WHERE
      state_id=${stateId};`;
  const stats = await dataBase.get(TotalGetQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getNameQuery = `
    select state_name from district natural join state where
    district_id = ${districtId};
    `;
  const state = await dataBase.get(getNameQuery);
  response.send({ stateName: state.state_name });
});
module.exports = app;
