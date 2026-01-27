const fetch = require('node-fetch'); // or just global fetch in newer node

const apiKey = 'AIzaSyDdLOFgoAIdjzk3BoWRlvjsZjZmXaToPQA';

async function listModels() {
    try {
        console.log('Fetching models with key ending in: ' + apiKey.slice(-4));
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error('API Error:', JSON.stringify(data.error, null, 2));
        } else {
            console.log('Available Models:');
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Network Error:', error);
    }
}

listModels();
