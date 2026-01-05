import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const JUDGE0_URL = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com/submissions';
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

console.log('Judge0 Configuration:');
console.log('URL:', JUDGE0_URL);
console.log('API Key:', JUDGE0_API_KEY ? `${JUDGE0_API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('\n');

async function testJudge0DirectCall() {
    const payload = {
        language_id: 62, // Java
        source_code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`,
        stdin: "",
        cpu_time_limit: 2,
        memory_limit: 256000
    };

    console.log('Testing direct Judge0 API call...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('\n');

    try {
        const response = await axios.post(`${JUDGE0_URL}?base64_encoded=false`, payload, {
            headers: {
                'content-type': 'application/json',
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
                'X-RapidAPI-Key': JUDGE0_API_KEY
            }
        });

        console.log('✅ Success!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Error:');
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Headers:', error.response?.headers);
        console.error('Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('\nFull error message:', error.message);

        if (error.response?.status === 422) {
            console.error('\n⚠️  422 Error - Validation failed. Common causes:');
            console.error('1. Invalid language_id');
            console.error('2. Invalid cpu_time_limit or memory_limit values');
            console.error('3. Missing required fields');
            console.error('4. API key issues or rate limiting');
        }
    }
}

testJudge0DirectCall();
