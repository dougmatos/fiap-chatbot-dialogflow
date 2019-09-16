// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const axios = require('axios').default; 

const baseApi = 'http://ergast.com/api/f1';

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });

  function welcome(agent) {
    agent.add(`Olá, eu sou o Senninha!`);
  }
 
  function fallback(agent) {
    agent.add(`Eu não entendi o que você quis dizer`);
    agent.add(`Desculpa, você pode repetir?`);
  }

  function nameWinner(driver)  { 
    return `🥇 ${driver.givenName} ${driver.familyName} (${driver.nationality})`;
  }

  async function winnersYearHandler(agent){
    try {
      let response = await axios.get(`${baseApi}/${agent.parameters.year}/results/1.json`);
      let races = response.data.MRData.RaceTable.Races
        .map(x => `${x.round} - ${x.raceName}\n${nameWinner(x.Results[0].Driver)}`);

      agent.add(`Esses são os pilotos que venceram corridas em ${agent.parameters.year}:\n\n ${races.join('\n\n')}`);

    } catch(error){
      console.log(error.message)
      agent.add('Ops! Não consegui buscar as informações para você');
    }
  }

  async function constructorsOfYearHandler(agent){
    try {
      let response = await axios.get(`${baseApi}/${agent.parameters.year}/constructors.json`);
      let races = response.data.MRData.ConstructorTable.Constructors
        .map(x => `🏎 ${x.name} - ${x.nationality}`);
      agent.add(
        `Os construtores de ${agent.parameters.year} foram: \n\n${races.join('\n')}`
      );

    } catch (error) {
      console.log(error.message)
      agent.add('Ops! Não consegui buscar as informações para você');
    }

  }

  async function driverWinnerHandler(agent){
    try {
      let response = await axios.get(`${baseApi}/drivers/${agent.parameters.piloto}/results/1.json?limit=1000`);
      let races = response.data.MRData.RaceTable.Races
        .map(x => `🏆 ${x.season} - ${x.raceName}`);
      
      let pilot = response.data.MRData.RaceTable.Races[0].Results[0].Driver;
      agent.add(`As corridas que ${pilot.givenName} ${pilot.familyName} venceu foram:\n${races.join('\n')}` );

    } catch (error) {
      console.log(error.message)
      agent.add('Ops! Não consegui buscar as informações para você');
    }
  }
  async function driverSeasonHandler(agent) {
    try {
      let response = await axios.get(`${baseApi}/drivers/${agent.parameters.piloto}/seasons.json?limit=1000`);
      let seasons = response.data.MRData.SeasonTable.Seasons.map(x => `🏁 ${x.season}`);
      agent.add(`Ai está as corridas em que o ${agent.parameters.piloto} participou:\n${seasons.join('\n')}`);

    } catch (error) {
      console.log(error.message)
      agent.add('Ops! Não consegui buscar as informações para você');
    }
  }

  async function driverNationalityHandler(agent) {
    try {
      let response = await axios.get(`${baseApi}/drivers.json?limit=900`);
      let drivers = response.data.MRData.DriverTable.Drivers
        .filter(x => x.nationality != null)
        .filter(x => x.nationality.toLowerCase() == (agent.parameters.nacionalidade || '').toLowerCase())
        .map(x => `- ${x.givenName} ${x.familyName}`).sort();

      agent.add(`Os pilotos  ${agent.parameters.nacionalidade} são:\n\n${drivers.join('\n')}`);

    } catch (error) {
      console.log(error.message)
      agent.add('Ops! Não consegui buscar as informações para você');
    }
  }

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('winners.year', winnersYearHandler);
  intentMap.set('contructors.year', constructorsOfYearHandler);
  intentMap.set('driver.winner', driverWinnerHandler);
  intentMap.set('driver.seasons', driverSeasonHandler);
  intentMap.set('driver.nationality', driverNationalityHandler);
  agent.handleRequest(intentMap);
});
