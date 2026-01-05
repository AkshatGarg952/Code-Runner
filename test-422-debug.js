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

async function testWithProblemFormat() {
    try {
        console.log('Testing with problem format (as client sends)...\n');

        const problem = {
            id: 'test-problem',
            title: 'Theatre Square',
            examples: [
                { input: '6 6 4', output: '4' }
            ],
            sampleTests: [
                { input: '6 6 4', output: '4' }
            ],
            timeLimit: 2,
            memoryLimit: 256000
        };

        console.log('Request payload:');
        console.log(JSON.stringify({ code: javaCode, language: 'java', problem }, null, 2));
        console.log('\n');

        const response = await axios.post('http://localhost:9000/run', {
            code: javaCode,
            language: 'java',
            problem: problem
        });

        console.log('✅ Success! Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ Error occurred:');
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Error data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Error message:', error.message);
    }
}

testWithProblemFormat();
