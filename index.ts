import axios from 'axios';

const baseUrl = 'https://api.metiundo.de/v1';
const loginEndpoint = '/auth/login';
const metersEndpoint = '/meteringpoints';
const readingsEndpoint = (meterId: string) => `/meteringpoints/${meterId}/readings`;

// Function to authenticate and get an access token
async function authenticate() {
  try {
    const response = await axios.post(`${baseUrl}${loginEndpoint}`, {
      email: 'takehome@metiundo.io',
      password: 'Vm91Y2hlckZvckltbWVkaWF0ZUhpcmUK'
    });
    return response.data.tokens.accessToken;  
  } catch (error) {
    console.error('Authentication failed:', error);
    return null;
  }
}

// Function to fetch the list of meters
async function fetchMeters(accessToken: string) {
  try {
    const response = await axios.get(`${baseUrl}${metersEndpoint}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch meters:', error);
    return [];
  }
}

// Function to fetch the readings for a specific meter within a date range
async function fetchReadings(accessToken: string, meterId: string, startDate: string, endDate: string) {
  try {
    const response = await axios.get(`${baseUrl}${readingsEndpoint(meterId)}`, {
      params: {
        from: startDate,
        to: endDate
      },
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;  
  } catch (error) {
    console.error('Failed to fetch readings:', error);
    return [];
  }
}

// Function to calculate total energy consumption from readings
function calculateTotalEnergyConsumption(readings: any[]): number {
  // Sort readings by readingTime
  readings.sort((a, b) => new Date(a.readingTime).getTime() - new Date(b.readingTime).getTime());

  let totalEnergyConsumed = 0;

  // Calculate total energy consumption by summing differences between consecutive readings
  for (let i = 1; i < readings.length; i++) {
    const previousReading = readings[i - 1];
    const currentReading = readings[i];

    if (currentReading.energyOut >= previousReading.energyOut) {
      const energyDifference = (currentReading.energyOut - previousReading.energyOut);
      totalEnergyConsumed += energyDifference;
    } else {
      console.error('Error: Energy readings are not in increasing order');
    }
  }

  // Convert to kWh (assuming energyOut is in Wh)
  return totalEnergyConsumed / 1000;
}

// Function to calculate maximum power from readings
function calculateMaxPower(readings: any[]): number {
  // Sort readings by readingTime
  readings.sort((a, b) => new Date(a.readingTime).getTime() - new Date(b.readingTime).getTime());

  let maxPower = 0;

  // Calculate power by finding the difference in energy over time and find the maximum power
  for (let i = 1; i < readings.length; i++) {
    const previousReading = readings[i - 1];
    const currentReading = readings[i];

    const energyDifference = currentReading.energyOut - previousReading.energyOut;
    const timeDifference = (new Date(currentReading.readingTime).getTime() - new Date(previousReading.readingTime).getTime()) / 3600000; // Convert ms to hours

    const power = energyDifference / timeDifference; // Power in Watts

    if (power > maxPower) {
      maxPower = power;
    }
  }

  return maxPower / 1000; // Convert to kW
}

// Main function to orchestrate authentication, fetching meters, and calculating consumption and power
async function main() {
  const accessToken = await authenticate();
  if (!accessToken) {
    console.log('No access token received');
    return;
  }

  const meters = await fetchMeters(accessToken);
  if (!meters || meters.length === 0) {
    console.log('No meters available or failed to fetch meters');
    return;
  }

  const readings = await fetchReadings(accessToken, meters[0].uuid, '1688162400000', '1690840800000');
  if (readings.length === 0) {
    console.log('No readings available for the given period');
    return;
  }

  console.log('Readings:', readings);

  const totalEnergyConsumed = calculateTotalEnergyConsumption(readings);
  const maxPower = calculateMaxPower(readings);

  console.log(`Total Electricity Consumption for July 2023: ${totalEnergyConsumed} kWh`);
  console.log(`Maximum Power in July 2023: ${maxPower} kW`);
}

// Run the main function
main();
