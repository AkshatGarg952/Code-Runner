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

const testInput = "6 6 4";

async function testJavaExecution() {
    try {
        console.log('Testing Java code execution...\n');
        console.log('Input:', testInput);
        console.log('Expected output: 4\n');

        const response = await axios.post('http://localhost:9000/execute', {
            code: javaCode,
            language: 'java',
            inputs: [testInput],
            timeLimit: 5,
            memoryLimit: 256000
        });

        console.log('Response:', JSON.stringify(response.data, null, 2));

        if (response.data.outputs && response.data.outputs.length > 0) {
            console.log('\n✅ Output:', response.data.outputs[0]);
        }
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('Full error details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

testJavaExecution();
