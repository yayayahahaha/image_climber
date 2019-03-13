import axios from 'axios';
import fs from 'fs'
import cheerio from 'cheerio'; //var $ = cheerio.load(res.data);
import _ from 'lodash';
import {
    TaskSystem
} from './flyc-lib/utils/TaskSystem';

var keyword = process.argv[2] ? process.argv[2] : false,
    directory = process.argv[3] ? process.argv[3] : String(keyword),
    baseUrl = 'https://wall.alphacoders.com',
    startPage = 1,
    imagesInformations = [],
    countloaded = 0,
    log = '';

keyword = 'bakemonogatari'; // testing data
// start
// init();

// testing init
var contents = fs.readFileSync('./result.json'),
    json = JSON.parse(contents);
getAllImageUrl(json);

async function getTotalImageNumber() {
    var totalImagesNumber = await axios({
        method: 'get',
        url: baseUrl + '/search.php',
        data: {
            search: keyword,
            page: 1
        }
    }).then(function(data) {
        var $ = cheerio.load(data.data),
            title = $('h1').text(),
            totalImagesNumber = title.trim() === '' ? 0 : title.trim().split(' ')[0];

        return parseInt(totalImagesNumber, 10);
    }).catch(function(error) {
        console.error(error);
    });
    return totalImagesNumber;
}

async function init() {
    if (!keyword) {
        console.log('the keyword can\'t be empty');
        console.log('please try \'$ npm start {{keyword}} [folder]\' again!');
        return;
    }

    var totalImageNumber = await getTotalImageNumber(),
        totalPagesNumber = Math.ceil(totalImageNumber / 30);

    getAllImagesId(totalPagesNumber);
}

async function getAllImagesId(page_number) {
    var taskArray = [],
        task_search = null;

    for (var i = 1; i <= page_number; i++) {
        taskArray.push(_createReturnFunction(i));
    }
    task_search = new TaskSystem(taskArray, 32);
    var response = await task_search.doPromise();

    var allImagesId = _.chain(response)
        .map(function(item) {
            return item.data;
        })
        .flattenDepth(1)
        .value();

    fs.writeFileSync('result.json', JSON.stringify(allImagesId, null, 2));

    getAllImageUrl(allImagesId);

    function _createReturnFunction(page) {
        var url = baseUrl + '/search.php?search=' + keyword + '&page=' + page
        return function() {
            return axios({
                method: 'get',
                url: url,
            }).then(function(data) {
                var $ = cheerio.load(data.data),
                    list = $('.thumb-container-big .boxgrid a'),
                    returnArray = [];
                for (var i = 0; i < list.length; i++) {
                    returnArray.push($(list[i]).attr('href').split('big.php?i=')[1]);
                }

                return returnArray;
            }).catch(function(error) {
                console.error(error);
            });
        }
    }
}

async function getAllImageUrl(allImagesId) {

    var taskArray = [],
        task_search = null;

    allImagesId.forEach(function(image_id) {
        taskArray.push(_createReturnFunction(image_id));
    });
    task_search = new TaskSystem(taskArray, 32);

    var response = await task_search.doPromise(),
        allImagesSrc = _.chain(response)
        .map(function(item) {
            return item.data;
        })
        .flattenDepth(1)
        .value();

    fs.writeFileSync('image_src.json', JSON.stringify(allImagesSrc, null, 2));

    function _createReturnFunction(image_id) {
        var url = baseUrl + '/big.php?i=' + image_id;
        return function() {
            return axios({
                method: 'get',
                url: url
            }).then(function(res) {
                var data = res.data,
                    $ = cheerio.load(data),
                    src = $('div.center.img-container-desktop a').attr('href');
                return src;
            }).catch(function(error) {
                console.error(error);
            });
        };
    }
}