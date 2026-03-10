// const fetch = require('node-fetch');

async function testHealth() {
    try {
        console.log("Checking Health...");
        const res = await fetch('http://localhost:5000/api/health');
        console.log("Health Status:", res.status);
        const data = await res.json();
        console.log("Health Data:", data);
    } catch (error) {
        console.error("Health Check Failed:", error);
    }
}

testHealth();
