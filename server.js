import express from "express"
import bodyParser from 'body-parser';
import admin from 'firebase-admin';

import dotenv from 'dotenv';
dotenv.config();


// Initialize Firebase Admin SDK
// if (!admin.apps.length) {
//     const firebase_private_key_b64 = Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64');
//     const firebase_private_key = firebase_private_key_b64.toString('utf8');
//     console.log("firebase private key " + firebase_private_key)
//     const serviceAccount = {
//         type: "service_account",
//         project_id: process.env.FIREBASE_PROJECT_ID,
//         private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
//         // private_key: process.env.FIREBASE_PRIVATE_KEY
//         //     .replace(/\\n/g, '\n') // Fix newlines
//         //     .replace(/_/g, ' '), // Replace underscores with spaces
//         private_key: firebase_private_key,
//         client_email: process.env.FIREBASE_CLIENT_EMAIL,
//         client_id: process.env.FIREBASE_CLIENT_ID,
//         auth_uri: "https://accounts.google.com/o/oauth2/auth",
//         token_uri: "https://oauth2.googleapis.com/token",
//         auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
//         client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
//     };
//     admin.initializeApp({
//         credential: admin.credential.cert(serviceAccount),
//         databaseURL: process.env.FIREBASE_DATABASE_URL,
//     });
// } else {
//     admin.app(); // Use the default app if already initialized
// }

// const db = admin.database();

const app = express()
app.use(bodyParser.json());

const port = process.env.PORT || 4000

app.get("/", function(req, res){
    res.json({
        message: "success",
        data: "api running"
    })
})

app.get("/other", function(req, res){
    res.json({
        message: "working test test",
        data: process.env.FIREBASE_PRIVATE_KEY
            // .replace(/\\n/g, '\n') //` Fix newlines
            // .replace(/_/g, ' '), // Replace underscores with spaces`
    })
})

app.post('/update-feeds', async (req, res) => {
    try {
        // Validate API key
        const clientApiKey = req.headers['x-api-key'];
        const serverApiKey = process.env.SECRET_API_KEY; // Replace with your actual ENV variable name

        if (!clientApiKey || clientApiKey !== serverApiKey) {
            return res.status(403).json({ error: 'Invalid API key' });
        }

        const apiKey = process.env.YOUTUBE_API_CREDENTIAL;

        const feedData = [
            { type: "rss", rssFeed: "https://www.door.link/rss.xml" },
            { type: "rss", rssFeed: "https://sarahcswett.substack.com/feed" },
            { type: "rss", rssFeed: "https://www.jarrettfuller.blog/feed.xml" },
            { type: "youtube", youtubeHandle: "leahsfieldnotes" },
            { type: "youtube", youtubeHandle: "hankschannel" },
            { type: "youtube", youtubeHandle: "wildrosie" },
        ];

        async function fetchYoutubeContent(handle) {
            const fetch = (await import('node-fetch')).default;
            try {
                const requestIDURL = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${handle}&key=${apiKey}`;
                const response = await fetch(requestIDURL);
                const data = await response.json();
                const channelID = data.items[0].id;

                const resultNum = 10;
                const requestVideoURL = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelID}&part=snippet,id&order=date&maxResults=${resultNum}`;
                const responseVideo = await fetch(requestVideoURL);
                const dataVideo = await responseVideo.json();

                return dataVideo.items.map((item) => ({
                    title: item.snippet.title,
                    link: `https://youtube.com/watch_popup?v=${item.id.videoId}`,
                    date: item.snippet.publishedAt,
                    source: item.snippet.channelTitle,
                }));
            } catch (error) {
                throw new Error(error.message || 'Error fetching videos');
            }
        }

        async function fetchRSSFeed(url) {
            const fetch = (await import('node-fetch')).default;
            try {
                const feedUrl = `https://rss2json.com/api.json?rss_url=${encodeURIComponent(url)}`;
                const response = await fetch(feedUrl);
                const data = await response.json();

                if (data.status === 'ok') {
                    return data.items.map((item) => ({
                        title: item.title,
                        link: item.link,
                        date: item.pubDate.replace(" ", "T"),
                        source: data.feed.title,
                    }));
                } else {
                    throw new Error(`Failed to fetch feed from ${url}`);
                }
            } catch (err) {
                console.error('Error fetching feed:', err);
                return [];
            }
        }

        function compareDates(a, b) {
            return new Date(b.date) - new Date(a.date);
        }

        let allFeedItems = [];
        for (const itemData of feedData) {
            let returnArray = [];
            if (itemData.type === 'youtube') {
                returnArray = await fetchYoutubeContent(itemData.youtubeHandle);
            } else if (itemData.type === 'rss') {
                returnArray = await fetchRSSFeed(itemData.rssFeed);
            }
            allFeedItems.push(...returnArray);
        }

        const sortedFeedItems = allFeedItems.sort(compareDates);

        const objectWithNumericKeys = sortedFeedItems.reduce((acc, currentValue, index) => {
            acc[index] = currentValue;
            return acc;
        }, {});

        await db.ref('data').set(objectWithNumericKeys);

        res.status(200).json({ message: 'Data successfully saved to Firebase!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save data to Firebase.' });
    }
})



app.listen(port, function(){
    console.log("the server is running")
})