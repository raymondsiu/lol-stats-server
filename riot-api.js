/**
 * Endpoints we need from the RIOT API
 */

const methods = {
  GET: "GET",
  POST: "POST"
};

const api_prefix = "https://na1.api.riotgames.com";

const RIOT_API = {
  get_summoner: {
    endpoint: api_prefix + "/lol/summoner/v3/summoners/by-name/",
    method: methods.GET
  },
  get_matchlists_by_accountid: {
    endpoint: api_prefix + "/lol/match/v3/matchlists/by-account/",
    method: methods.GET
  },
  get_match_by_id: {
    endpoint: api_prefix + "/lol/match/v3/matches/",
    method: methods.GET
  },
  get_champion_by_id: {
    endpoint: api_prefix + "/lol/static-data/v3/champions/",
    method: methods.GET
  },
  get_summoner_spells_by_id: {
    endpoint: api_prefix + "/lol/static-data/v3/summoner-spells/",
    method: methods.GET
  },
  get_item_data_by_id: {
    endpoint: api_prefix + "/lol/static-data/v3/items/",
    method: methods.GET
  },
  static_summoner_url:
    "https://ddragon.leagueoflegends.com/cdn/6.24.1/data/en_US/summoner.json",
  static_champion_url:
    "https://ddragon.leagueoflegends.com/cdn/6.24.1/data/en_US/champion.json",
  static_item_url:
    "https://ddragon.leagueoflegends.com/cdn/6.24.1/data/en_US/item.json"
};

module.exports = RIOT_API;
