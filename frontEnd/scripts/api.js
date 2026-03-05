const clientId = '7c5773b9dcc149b38a50f1d7d83c34a7';
const clientSecret = 'f9a584351aac45889f29e806274d73c4';

async function getAccessToken() {

    const credentials = btoa(clientId + ':' + clientSecret);

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + credentials
        },
        body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    return data.access_token;
}

async function main() {
    try {
        const token = await getAccessToken();
        const ladyGagaId = '1hy7t0A9uArvPBQD9pZ9qi';

        const response = await fetch(`https://api.spotify.com/v1/search?q=katy perry&type=artist`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        console.log(data);
        
    } catch (error) {
        console.error("Technische fout:", error);
    }
}

main();