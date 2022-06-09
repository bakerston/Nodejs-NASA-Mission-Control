const axios = require('axios');


const launchesDatabase = require('./launches.mongo');
const { populate } = require('./planets.mongo');
const planets = require('./planets.mongo');

const DEFAULT_FLIGHT_NUMBER = 100;


const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';

async function popualateLaunches() {
    console.log('Downloading launch data...');
    const response = await axios.post(SPACEX_API_URL, {
        query: {},
        options: {
            pagination: false,
            populate: [
                {
                    path: 'rocket',
                    select: {
                        name: 1
                    }
                },
                {
                    path: 'payloads',
                    select: {
                        'customers': 1
                    }
                }
            ]
        }
    });

    if (response.status !== 200) {
        console.log('Problem downloading data');
        throw new Error('Launch failed');
    }

    const launchDocs = response.data.docs;
    for (const launchDoc of launchDocs) {
        const payloads = launchDoc['payloads'];
        const customers = payloads.flatMap((payload) => {
            return payload['customers'];
        });

        const launch = {
            flightNumber: launchDoc['flight_number'],
            mission: launchDoc['name'],
            rocket: launchDoc['rocket']['name'],
            launchDate: launchDoc['date_local'],
            upcoming: launchDoc['upcoming'],
            success: launchDoc['success'],
            customers: customers,
        };
        console.log(`${launch.flightNumber} ${launch.mission}`);

        await saveLaunch(launch);
    }
}

async function loadLaunchData() {
    const firstLaunch = await findLaunch({
        flightNumber: 1,
        rocket: 'Falcon 1',
        mission: 'FalconSat',
    });
    if (firstLaunch) {
        console.log('Already loaded');
    } else{
        await popualateLaunches();
    }
    
}

async function findLaunch(filter) {
    return await launchesDatabase.findOne(filter);
}


async function existsLaunchWithId(launchId) {
    return await launchesDatabase.findOne({
        flightNumber: launchId,
    });
}
// function existsLaunchWithId(launchId) {
//     return launches.has(launchId);
// }

async function getLatestFlightNumber() {
    const latestLaunch = await launchesDatabase
        .findOne()
        .sort('-flightNumber');
    if(!latestLaunch) {
        return DEFAULT_FLIGHT_NUMBER;
    }
    return latestLaunch.flightNumber;
}



async function getAllLaunches(skip, limit) {
    console.log(`In getAllLaunches skip = ${skip}, limit = ${limit}`);
    return await launchesDatabase
        .find({}, {'_id':0, '__v':0})
        .sort({flightNumber:1})
        .skip(skip)
        .limit(limit);
}

async function saveLaunch(launch) {
    await launchesDatabase.findOneAndUpdate({
        flightNumber: launch.flightNumber,
    }, launch, {
        upsert: true,
    });
}

async function scheduleNewLaunch(launch) {
    const planet = await planets.findOne({
        kepler_name: launch.target,
    });

    if (!planet) {
        throw new Error('No matching planet found');
    }


    const newFlightNumber = await getLatestFlightNumber() + 1;
    
    const newLaunch = Object.assign(launch, {
        success: true,
        upcoming: true,
        customers: ['ZTM', 'NASA'],
        flightNumber: newFlightNumber,
    });

    await saveLaunch(newLaunch);
}
// function addNewLaunch(launch) {
//     latestFlightNumber += 1;
//     launches.set(
//         latestFlightNumber, 
//         Object.assign(launch, {
//             success: true,
//             upcoming: true,
//             cusstomers: ['ZTM', 'NASA'],
//             flightNumber: latestFlightNumber,
//         })
//     );
// }


async function abortLaunchById(launchId) {
    const aborted = await launchesDatabase.updateOne({
        flightNumber: launchId,
    }, {
        upcoming: false,
        success: false,
    });
    return aborted.modifiedCount === 1;
}
// function abortLaunchById(launchId) {
//     const aborted = launches.get(launchId);
//     aborted.upcoming = false;
//     aborted.success = false;
//     return aborted;
// }


module.exports = {
    loadLaunchData,
    getAllLaunches,
    existsLaunchWithId,
    scheduleNewLaunch,
    abortLaunchById,
}