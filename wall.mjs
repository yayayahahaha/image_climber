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
init();

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

    // for (var i = 1; i <= page_number; i++) {
    for (var i = 1; i <= 2; i++) {
        taskArray.push(_createReturnFunction(i));
    }
    task_search = new TaskSystem(taskArray, 32);
    var response = await task_search.doPromise();

    var allImagesId = _.chain(response)
        .flattenDepth(1)
        .value();
    fs.writeFileSync('result.json', JSON.stringify(allImagesId, null, 2));
    console.log(allImagesId);

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