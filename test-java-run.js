import axios from 'axios';

const javaCode = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        long n = sc.nextLong();
        long m = sc.nextLong();
        long a = sc.nextLong();

        long tilesAlongN = (n + a - 1) / a;
        long tilesAlongM = (m + a - 1) / a;

        System.out.println(tilesAlongN * tilesAlongM);
    }
}`;

async function testRunEndpoint() {
    try {
        console.log('Testing /run endpoint (with problem object)...\n');

        const problem = {
            id: 'test-problem',
            title: 'Theatre Square',
            examples: [
                { input: '6 6 4', output: '4' }
            ],
            timeLimit: 5,
            memoryLimit: 256000
        };

        const response = await axios.post('http://localhost:9000/run', {
            code: javaCode,
            language: 'java',
            problem: problem
        });

        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Full error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testRunEndpoint();
