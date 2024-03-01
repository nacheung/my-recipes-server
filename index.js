import { load } from "cheerio";
import request from "axios";
import express from "express";
import cors from "cors";
import he from 'he';


const app = express();

app.use(cors());
app.use(express.json());

let title, ingredients, instructions;

function htmlDecodeWithLineBreaks($, html) {
    console.log(html);
    let myhtml = html
    .replace(/<\/li>/gm, '\n</li>').replace(/<\/div>/gm, '</div>\n').replace(/<\/h1>/gm, '<\n').replace(/<script>(.|\n|\r)*?<\/script>/gm, '').replace(/<(?:.)*?>/gm, ''); // remove all html tags
    // console.log(myhtml);
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
    console.log(title);

    let anchor = $('a').filter((index, element) => {
        return $(element).text().trim().toLowerCase() == "jump to recipe";
    });
    let href = $(anchor).attr('href');
    // console.log(href);

    // let text = $(href).text();
    // console.log($(href).html());
    let text = htmlDecodeWithLineBreaks($, $(href).html());
    // console.log(htmlDecodeWithLineBreaks($, $(href).html()));
    // console.log(text);

    let starting_at_ingredients = text.replace(new RegExp('(.|\n)*(\t|\n|\s|\r)+Ingredients(\t|\n|\s|\r)+'), '');
    starting_at_ingredients.trimStart();
    ingredients = starting_at_ingredients.replace(new RegExp('(\t|\n|\s|\r)+Instructions(.|\n|\r)*'), '');
    let starting_at_instructions = text.replace(new RegExp('(.|\n)*(\t|\n|\s|\r)+Instructions(\t|\n|\s|\r)+'), '');
    instructions = "-" + starting_at_instructions.replace(/\n(?!(\n|\r|\t|\s)+)/g, '\n -').replace(/(\r?\n\t?\s?){3,}/g, ''); // add dashes and remove extra line breaks
    // console.log(ingredients);
    // console.log(instructions);

}


app.get('/message', (req, res) => {
    performScraping(req.query.url).then(() => res.send({ title: title, ingredients: ingredients, instructions: instructions}));
});

app.listen(8000, () => {
    console.log(`Server is running on port 8000.`);
  });