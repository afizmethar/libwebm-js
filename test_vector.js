import createLibWebM from './dist/wrapper.js';

async function testVector() {
    try {
        const libwebm = await createLibWebM();
        console.log('Module keys with Vector:', Object.keys(libwebm).filter(k => k.includes('Vector')));
        console.log('VectorUint8 type:', typeof libwebm.VectorUint8);
        console.log('VectorUint8 exists:', 'VectorUint8' in libwebm);

        // Test different ways to access VectorUint8
        console.log('Direct access:', libwebm.VectorUint8);
        console.log('All keys containing "vector" (case insensitive):',
            Object.keys(libwebm).filter(k => k.toLowerCase().includes('vector')));
        console.log('All keys containing "uint8":',
            Object.keys(libwebm).filter(k => k.toLowerCase().includes('uint8')));

        // Try creating it
        if (libwebm.VectorUint8) {
            const vec = new libwebm.VectorUint8();
            console.log('Successfully created VectorUint8:', vec);
            vec.delete();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testVector();
