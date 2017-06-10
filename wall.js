var request = require("request");
var fs = require("fs");
var cheerio = require("cheerio");
var axios = require("axios");

var url = "https://exhentai.org/g/998656/a6fdd9783f/";

var key_words = process.argv[2] ? process.argv[2] : "kill la kill",
    directory = process.argv[3] ? process.argv[3] : "./" + new Date().toString().replace(/T/, ' ').replace(/\..+/, '').replace(/:/g, "-"),
    startPage = 1,
    totalImagesNumber = 0,
    imagesInformations = [],
    countloaded = 0;

console.log("key words: " + key_words);
console.log("directory: " + directory);

/* create directory */
if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory);
}


getPageNumber(startPage);

function getPageNumber(nowPage) {
    axios({
            method: 'get',
            url: "https://wall.alphacoders.com/search.php?search=" + encodeURI(key_words) + "&page=" + nowPage,
        })
        .then(function(res) {
            var $ = cheerio.load(res.data);
            list = $(".thumb-container-big .boxgrid a img"),
                src = null,
                checker = [],
                lastNode = null;


            checker = getImageInfo(nowPage, list, $, checker, true);
            checker = checker[checker.length - 1];
            lastNode = imagesInformations[imagesInformations.length - 1];

            if (lastNode) {
                if (lastNode.id === checker.id && lastNode.route === checker.route) {
                    imagesInformations = combineRouteAndID(imagesInformations);
                    fs.writeFileSync("result.json", JSON.stringify(imagesInformations));

                    console.log("\ndownload started!\n");
                    totalImagesNumber = imagesInformations.length;
                    for (var i = 0; i < imagesInformations.length; i++) {
                        obj = imagesInformations[i];
                        download(obj.src, directory, obj.name, totalImagesNumber);
                        obj = null;
                    }

                    return;
                }
            }
            imagesInformations = getImageInfo(nowPage, list, $, imagesInformations);

            list = null;
            nowPage++;
            getPageNumber(nowPage);
        })
        .catch(function(error) {
            console.log(error);
        });
}

function download(url, dir, filename, total) {
    request(url, function(er, res, body) {
        if (er) {
            console.log("retry: " + filename);
            download(url, dir, filename, total);
            return;
        }
        countloaded++;
        console.log(countloaded + " / " + total + " ," + Math.round(countloaded * 1000 / total) / 10 + "%");
    }).pipe(fs.createWriteStream(dir + "/" + filename));
}

function combineRouteAndID(input) {
    var tmp = [];
    for (var i = 0; i < input.length; i++) {
        obj = input[i];
        tmp.push({
            name: obj.id,
            src: "https://" + obj.header + ".alphacoders.com/" + obj.route + "/" + obj.id
        });

        obj = null;
    }
    return tmp;
}

function getImageInfo(nowPage, list, $, inputArray, checker) {
    var imagesInformations = inputArray.slice();

    for (var i = 0; i < list.length; i++) {
        src = $(list[i]).attr("src").split(".com/")[1];
        header = $(list[i]).attr("src").split(".com/")[0];
        imagesInformations.push({
            page: nowPage,
            route: src.split("/")[0],
            id: src.split("/")[1].split("-")[2],
            header: header.split(".alphacoders")[0].split("//")[1]
        });

        src = null;
    }
    if (!checker) {
        console.log("get page " + nowPage + " data success");
    }
    return imagesInformations;
}