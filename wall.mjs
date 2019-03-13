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
    totalPagesNumber = 0,
    totalImagesNumber = 0,
    imagesInformations = [],
    countloaded = 0,
    log = '';

 // create directory
if (!!!keyword) {
    console.log('the keyword can\'t be empty');
    console.log('please try \'$ npm start {{keyword}} [folder]\' again!');
} else if (true) {
    console.log('here');
} else {
     // start

     // get total page number
    var r = request.get(
        'https://wall.alphacoders.com/search.php?search=' + encodeURI(keyword) + '&page=' + 9999999999,
        function(err, res, body) {
            totalPagesNumber = res.request.uri.href;
            totalPagesNumber = totalPagesNumber.split('&page=')[1];
            totalPagesNumber = parseInt(totalPagesNumber);
            if (totalPagesNumber === 9999999999) {
                console.log('Sorry, we have no results for your search! please try another keyword');
                return;
            }
            insertLog('key words: ' + keyword);
            insertLog('directory: ' + directory);

            insertLog('total page number: ' + totalPagesNumber);

            getPageNumber(startPage);
        });
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