const process = require("process");
// require("dotenv").config();
const path = require("path");
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const fetch = require("isomorphic-unfetch");
const riot_api = require("./riot-api");
const _ = require("lodash");

// io.on("connection", function(socket) {});

const api_key = process.env.RIOT_API_KEY;
console.log("API_KEY: ", process.env.RIOT_API_KEY);
const lastXmatches = process.env.LAST_X_MATCHES || 2;

let summonerJSON, championJSON, itemJSON;

// API Calls for static data has really low rate limits so instead, I'll pull in the json data from CDN and cache
fetch(riot_api.static_summoner_url)
  .then(resp =>
    resp.json().then(data => {
      summonerJSON = data;
    })
  )
  .catch(err => {
    console.log("Error fetching JSON assets", err);
    process.exit(1);
  });
fetch(riot_api.static_champion_url)
  .then(resp =>
    resp.json().then(data => {
      championJSON = data;
    })
  )
  .catch(err => {
    console.log("Error fetching JSON assets", err);
    process.exit(1);
  });
fetch(riot_api.static_item_url)
  .then(resp =>
    resp.json().then(data => {
      itemJSON = data;
    })
  )
  .catch(err => {
    console.log("Error fetching JSON assets", err);
    process.exit(1);
  });

/**
 * Main RIOT Logic
 * @param {*} summoner
 */
async function callRIOT(summoner) {
  try {
    // First we need the summoner's accountId
    let response = await fetch(riot_api.get_summoner.endpoint + summoner, {
      method: riot_api.get_summoner.method,
      headers: { "X-Riot-Token": api_key }
    });
    // Destructure the accountId and summoner name
    const { accountId, name: summonerName } = await response.json();
    // Fetch just the last ten matches
    response = await fetch(
      riot_api.get_matchlists_by_accountid.endpoint +
        accountId +
        "?beginIndex=0&endIndex=" +
        lastXmatches,
      {
        method: riot_api.get_matchlists_by_accountid.method,
        headers: { "X-Riot-Token": api_key }
      }
    );
    // Destructure and get the list of matches
    const { matches } = await response.json();
    let gameIds = [];

    matches.forEach(match => {
      gameIds.push({ gameId: match.gameId, champion: match.champion });
    });

    // Final output data object
    let matchesData = [];

    // For each match, we will extract the data we need for the summoner
    return Promise.all(
      gameIds.map(async match => {
        try {
          const matchResponse = await fetch(
            riot_api.get_match_by_id.endpoint + match.gameId,
            {
              method: riot_api.get_match_by_id.method,
              headers: { "X-Riot-Token": api_key }
            }
          );
          const matchData = await matchResponse.json();
          const {
            gameDuration,
            gameCreation,
            participants,
            participantIdentities
          } = matchData;
          const participantId = participantIdentities.find(
            participant => participant.player.accountId === accountId
          ).participantId;

          // Use participantId to get the rest of the stats
          const ix = participants.findIndex(
            participant => participant.participantId === participantId
          );
          const { championId, stats, spell1Id, spell2Id } = Object.assign(
            {},
            participants[ix]
          );

          matchesData.push({
            summonerName,
            gameDuration, // Seconds
            gameCreation, // Epoch date time
            champion: _.find(championJSON.data, { key: championId.toString() })
              .name,
            championLevel: stats.champLevel,
            win: stats.win,
            kills: stats.kills,
            deaths: stats.deaths,
            assists: stats.assists,
            spells: [
              _.find(summonerJSON.data, { key: spell1Id.toString() }).name,
              _.find(summonerJSON.data, { key: spell2Id.toString() }).name
            ],
            items: [
              itemJSON.data[stats.item1] && itemJSON.data[stats.item1].name,
              itemJSON.data[stats.item2] && itemJSON.data[stats.item2].name,
              itemJSON.data[stats.item3] && itemJSON.data[stats.item3].name,
              itemJSON.data[stats.item4] && itemJSON.data[stats.item4].name,
              itemJSON.data[stats.item5] && itemJSON.data[stats.item5].name,
              itemJSON.data[stats.item6] && itemJSON.data[stats.item6].name
            ]
          });
          // console.log(JSON.stringify(stats), matchesData);
        } catch (err) {
          console.log("Error resolving promises: ", err);
        }
      })
    )
      .then(() => {
        // console.log("Finished promises. Match data: ", matchesData);
        // Successful repsonse
        return {
          summonerName: matchesData[0] ? matchesData[0].summonerName : summoner,
          data: Array.from(matchesData),
          error: null
        };
      })
      .catch(err => {
        console.log("Error resolving promises: ", err);
        return {
          summonerName: summoner,
          data: [],
          error: "RIOT API error: " + err.toString()
        };
      });
  } catch (err) {
    // If any errors occur in the API call process occurs, we return no data and an error messge
    return {
      summonerName: summoner,
      data: [],
      error: "RIOT API error: " + err.toString()
    };
  }
}

// Allow CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Main end point to get match history for given summoner name
app.get("/matches/:summoner", async (req, res) => {
  const response = await callRIOT(req.params.summoner);
  const data = await response;
  console.log("Response to browser", data);
  if (!data) data = { data: [], error: "Error occurred while calling RIOT" };
  res.send(data);
});

// Serve static assets
// app.use(express.static(path.join(__dirname, "../client/build/")));
// app.use("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/build/index.html"));
// });

http.listen(process.env.PORT || 9000, function() {
  console.log("Listening on port 9000 or process.env.PORT");
});
