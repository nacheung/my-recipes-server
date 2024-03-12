import { load } from "cheerio";
import request from "axios";
import express from "express";
import cors from "cors";
import he from 'he';
import mysql from "mysql";
import 'dotenv/config';



const app = express();



app.use(
    cors({
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true,
    })
   );
app.use(express.json());

 const db = mysql.createConnection({
    host: "localhost",
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: "myrecipes",
  });

let title, ingredients, instructions, image;

function htmlDecodeWithLineBreaks($, html) {
    // console.log(html);
    let myhtml = html
    .replace(/<\/li>/gm, '\n</li>').replace(/<\/div>/gm, '</div>\n').replace(/<\/h\d>/gm, '\n').replace(/<script>(.|\n|\r)*?<\/script>/gm, '').replace(/<(?:.)*?>/gm, ''); // remove all html tags
    return he.decode(myhtml);
  }


async function performScraping(url) {
    // downloading the target web page
    // by performing an HTTP GET request in Axios
    const axiosResponse = await request({
        method: "GET",
        url: url,
        headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
        }
    })
    const $ = load(axiosResponse.data);
    
    let title_element = $('.entry-title')[0];
    title = $(title_element).text();

    let image_element = $('img').filter((index, element) => {
        console.log($(element).toString())
        // console.log($(element).toString());
        // console.log(title);
        // console.log($(element).toString().replace(/.*?title=("|')/, '').replace(/("|').*/gm, '').trim().toLowerCase());
        // console.log($(element).toString().replace(/.*?title=("|')/, '').replace(/("|').*/gm, ''));
        // console.log($(element).toString().replace(/.*?title=("|')/, '').replace(/("|').*/gm, '').trim().toLowerCase() == title.trim().toLowerCase());
        return $(element).toString().replace(/.*?title=("|')/, '').replace(/("|').*/gm, '').trim().toLowerCase() == title.trim().toLowerCase();
    })
    // console.log(image_element);
    image = $(image_element).attr('src');
    console.log(image);
    // if(image.slice(0,4) == "data") image = $(image_element).attr('data-lazy-src');
    // console.log(image);
    

    let anchor = $('a').filter((index, element) => {
        return $(element).text().trim().toLowerCase() == "jump to recipe";
    });
    let href = $(anchor).attr('href');

    let element = $(href);

    while ($(element).length != 0) {
        if (($(element)[0].name == "div" || $(element)[0].name == "section") && $(element).html().includes("Ingredients") && $(element).html().includes("Instructions")) {
            break;
        }
        element = $(element).next();

    }


    let text = htmlDecodeWithLineBreaks($, $(element).html());



    let textWithNoExtraLineBreaks = text.replace(/(\r?\n\t?\s?){3,}/g, '\n');

    let starting_at_ingredients = textWithNoExtraLineBreaks.replace(new RegExp('(.|\n)*(\t|\n|\s|\r)+Ingredients(\t|\n|\s|\r)*'), '');
    starting_at_ingredients.trimStart();
    ingredients = starting_at_ingredients.replace(new RegExp('(\t|\n|\s|\r)*Instructions(.|\n|\r)*'), '').replace(/Cook Mode(.|\n|\r)*Prevent your screen from going dark/g, '');
    let starting_at_instructions = text.replace(new RegExp('(.|\n|\r)*?(\t|\n|\s|\r)*Instructions(\t|\n|\s|\r)*'), '');
    instructions = "-" + starting_at_instructions.replace(/\n(?!(\n|\r|\t|\s)+)/g, '\n -'); 

}


app.get('/message', (req, res) => {
    performScraping(req.query.url).then(() => res.send({ title: title, ingredients: ingredients, instructions: instructions, image: image}));
});

app.post('/register', (req, res)=> {
    const username = req.body.username;
    const password = req.body.password;
    db.query(
        "INSERT INTO users (username, password) VALUES (?,?)",
        [username, password],
        (err, result)=> {
            console.log(err);
      }
    );
 });

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    db.query(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password],
        (err, result)=> {
            if (err) {
                res.send({err: err});
            }
    
            if (result.length > 0) {
                res.send( result);
            }
            else(res.send({message: "Wrong username/password comination!"}));
        }
    );
});

app.post('/save', (req, res) => {
    const username = req.body.username;
    const url = req.body.url;
    const title = req.body.title;
    const ingredients = req.body.ingredients;
    const instructions = req.body.instructions;
    const image = req.body.image

    db.query(
        "INSERT INTO recipes (username, url, title, ingredients, instructions, image) VALUES (?,?,?,?,?,?)",
        [username, url, title, ingredients, instructions, image],
        (err, result) => {
            if (!err) {
                res.send({result});
            } else {
                console.log(err);
            }
        }
    );
});


app.post('/getrecipes', (req, res) => {
    const username = req.body.username;

    db.query(
        "SELECT url, title, image FROM recipes WHERE username = ?",
        [username],
        (err, result)=> {
            if (err) {
                res.send({err: err});
            }
    
            if (result.length > 0) {
                res.send( result);
            }
            else(res.send({message: "No recipes"}));
        }
    );
});

app.listen(8000, () => {
    console.log(`Server is running on port 8000.`);
  });
  app.listen(3001, () => {
    console.log("running server"
    );
 });
