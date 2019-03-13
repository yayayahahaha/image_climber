import axios from 'axios';
import fs from 'fs'
import cheerio from 'cheerio'; //var $ = cheerio.load(res.data);
import _ from 'lodash';
import {
    TaskSystem
} from './flyc-lib/utils/TaskSystem';

var keyword = process.argv[2] ? process.argv[2] : false,
    directory = process.argv[3] ? process.argv[3] : String(keyword),
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
        url: 'https://wall.alphacoders.com/search.php',
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
        // task_search = new TaskSystem(taskArray, 32);

    // for (var i = 1; i <= page_number; i++) {
    for (var i = 1; i <= 1; i++) {
        taskArray.push(_createReturnFunction(i));
    }
    task_search = new TaskSystem(taskArray, 32);
    var response = await task_search.doPromise();
    console.log(response);
    fs.writeFileSync('result.json', JSON.stringify(response));

    function _createReturnFunction(page) {
        var url = 'https://wall.alphacoders.com/search.php?search=' + keyword + '&page=' + page
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


function getPageNumber(nowPage) {
    axios({
            method: 'get',
            url: 'https://wall.alphacoders.com/search.php?search=' + encodeURI(keyword) + '&page=' + nowPage,
        })
        .then(function(res) {
            var $ = cheerio.load(res.data),
                list = $('.thumb-container-big .boxgrid a img'),
                src = null;

            imagesInformations = getImageInfo(nowPage, list, $, imagesInformations);

            if (nowPage === totalPagesNumber) {
                imagesInformations = combineRouteAndID(imagesInformations);

                // check if directory alreayd exist or not
                if (!fs.existsSync(directory)) {
                    fs.mkdirSync(keyword);
                }

                console.log('\ndownload started!\n');
                totalImagesNumber = imagesInformations.length;
                for (var i = 0; i < imagesInformations.length; i++) {
                    obj = imagesInformations[i];
                    download(obj.src, directory, obj.name, totalImagesNumber);
                    obj = null;
                }
            } else {
                list = null;
                nowPage++;
                getPageNumber(nowPage);
            }
        })
        .catch(function(error) {
            insertLog(error);
        });
}

function insertLog(input, hide) {
    if (!hide) {
        console.log(input);
    }
    log += new Date();
    log += '\n';
    log += input;
    log += '\n';
    log += '\n';
}

function endingPoint() {
    var log_name = keyword + ' ' + (new Date()).toString().replace(/\./g, '-').replace(/\:/g, '-') + '.txt';

    insertLog('Downloaded finished', true);
    console.log('\n=========================================');
    console.log('all iamges are downloaded!');
    console.log('check out \'' + log_name + '\' for more information.');
    console.log('=========================================');
    fs.writeFileSync(log_name, log);
}

function download(url, dir, filename, total) {
    insertLog('start download ' + filename, true);
    request(url, function(er, res, body) {
        if (er) {
            insertLog('retry: ' + filename);
            download(url, dir, filename, total);
            return;
        }
        countloaded++;
        console.log(countloaded + ' / ' + total + ' || ' + Math.round(countloaded * 1000 / total) / 10 + '%');

        // check all files downloaded or not
        if (countloaded === total) {
            endingPoint();
        }

    }).pipe(fs.createWriteStream(dir + '/' + filename));
}

function combineRouteAndID(input) {
    var tmp = [];
    for (var i = 0; i < input.length; i++) {
        obj = input[i];
        tmp.push({
            name: obj.id,
            src: 'https://' + obj.header + '.alphacoders.com/' + obj.route + '/' + obj.id
        });

        obj = null;
    }
    return tmp;
}

function getImageInfo(nowPage, list, $, inputArray, checker) {
    var imagesInformations = inputArray.slice();

    for (var i = 0; i < list.length; i++) {
        src = $(list[i]).attr('src').split('.com/')[1];
        header = $(list[i]).attr('src').split('.com/')[0];
        imagesInformations.push({
            page: nowPage,
            route: src.split('/')[0],
            id: src.split('/')[1].split('-')[2],
            header: header.split('.alphacoders')[0].split('//')[1]
        });

        src = null;
    }
    if (!checker) {
        insertLog('get page ' + nowPage + ' data success');
    }
    return imagesInformations;
}