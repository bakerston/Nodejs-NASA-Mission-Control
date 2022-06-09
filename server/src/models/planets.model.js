// const parse = require('csv-parse');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
//const { httpGetAllPlanets } = require('../routes/planets/planets.controller');

const planets = require('./planets.mongo');

function isHabit(planet) {
    return planet['koi_disposition'] === 'CONFIRMED'
        && planet['koi_insol'] > 0.36 && planet['koi_insol'] < 1.11
        && planet['koi_prad'] < 1.6;
}


function loadPlanetsData() {
    return new Promise((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, '..', '..', 'data', 'kepler_data.csv'))
        .pipe(parse({
            comment: '#',
            columns: true,
        }))
        .on('data', async (data) => {
            if (isHabit(data)) {  
                savePlanet(data);
            }
        })
        .on('error', (err) => {
            console.log(err);
            reject(err);
        })
        .on('end', async () => {
            const countPlanetFound = (await getAllPlanets()).length;
            console.log(`${countPlanetFound} habitable found`);
            resolve();
        });
    });
}

async function getAllPlanets() {
    return await planets.find({}, {
        '_id':0, '__v':0,
    });
}

async function savePlanet(planet) {
    try {
        await planets.updateOne({
            kepler_name: planet.kepler_name,
        }, {
            kepler_name: planet.kepler_name,
        }, {    
            upsert: true,
        });
        //console.log(`saved ${planet.kepler_name}`);
    } catch(err) {
        console.log(`Could not save planet ${err}`);
    }
}



module.exports = {
    loadPlanetsData,
    getAllPlanets,  
};