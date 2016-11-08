/**
 * Created by administrator on 03.11.16.
 */
var csv = require("fast-csv"),
    fs = require("fs"),
    path = require("path");

var emptyPerson = {
    name: "",
    //id: "",
    office: "",
    position: "",
    professionGroup: "",
    uah: "",
    usd: "",
    gbp: "",
    eur: "",
    total: "",
    region: ""
};

//collectByField("position", ["судя", "суду", "судя"],  "suddi-auto.csv");
collectByField("e-all-sorted.csv");

function collectByField (outputFileName) {
    fs.createReadStream("cash.csv")
        .pipe(csv.parse({headers: true}))
        //pipe the parsed input into a csv formatter
        .pipe(csv.format({headers: true}))
        //Using the transfrom function from the formatting stream
        .transform(function (row, next) {
            var person = {
                name: row.name,
                //id: row.uuid,
                office: row.office,
                position: row.position,
                professionGroup: defineProfessionGroup(row),
                uah: summCur(row, "UAH"),
                usd: summCur(row, "USD"),
                gbp: summCur(row, "GBP"),
                eur: summCur(row, "EUR")
            };
            person.total = Math.floor((person.uah || 0) / 26 + (person.usd || 0) + (person.gbp || 0) * 1.2 + (person.eur || 0) * 1.09);
            if ((!person.professionGroup && person.total < 400000) || person.total < 24000)  {
                next(void 0, emptyPerson);
            }
            else {

            person.region = findRegion(row);

            next(void 0, person) }
        })
        .pipe(fs.createWriteStream(outputFileName))
        .on("finish", () => {console.log("DONE")})
        .on("end", process.exit);
}

function summCur(i, cur) {
    var map = ["готівкові кошти", "кошти, розміщені на банківських рахунках", "інше", "кошти, позичені третім особам", "активи у дорогоцінних (банківських) металах", "внески до кредитних спілок та інших небанківських фінансових установ"]
    var sum = 0;
    map.forEach(function (name) {
        var decl = i["Декларант/" + name + "/" + cur];
        var rod = i["Родина/" + name + "/" + cur];
        sum = sum + (!isNaN(+decl) ? +decl : 0) + (!isNaN(+rod) ? +rod : 0);
    });
    return sum === 0 ? "" : sum;
}

function defineProfessionGroup(d) {
    var prokuraturaMap = ["прокурор", "прокурат", "пркур", "прокрор", "прокруор"];// ["генеральна прокуратура", "генеральна прокуратура україни", "прокуратура"];
    var deputatyMap = ["апарат верховної ради україни", "верховна рада україни", "верховна рада", "народний депутат", "народный депутат"];
    var golovaMap = ["міський голова", "сільський голова", "обласний голова", "районний голова"]; //["голова", "голови", "глава", "глави"];
    var suddiMap = ["судя", "суду", "судя", "судья", "голова суду", /суд$/, /суд\s/, /голова\s.*суду/, /голова\s.*суда/];
    var ministerstvoMap = ["міністерств", /міністр(?!(ац|ат))/, ];
    var slidchiMap = ["следователь", "слідчий", "детектив", "слідчого", "поліці", "оперуповноважений"];
    var inspectorMap = ["інспектор", "інспекц"];
    var ofice = d.office.toLowerCase();
    var position = d.position.toLowerCase();
    return testAny(ministerstvoMap, ofice) || testAny(ministerstvoMap, position) ? "ministerstvo"
            :testAny(deputatyMap, ofice) || testAny(deputatyMap, position) ? "deputat"
        : testAny(prokuraturaMap, ofice) || testAny(prokuraturaMap, ofice) ? "prokuratura"
        : testAny(golovaMap, ofice) || testAny(golovaMap, position) || ((~position.search("голова") || ~position.search("заступник голови") || ~position.search("заступник міського голови")) && (~position.search("адміністрації") || ~position.search("ода") || ~ofice.search("ода") || ~ofice.search("рада") || ~ofice.search("адміністрації") )) ? "golova"
        : testAny(suddiMap, position) || testAny(suddiMap, ofice) ? "suddia"
        : testAny(slidchiMap, position) ? "slidchi"
        : testAny(inspectorMap, position) || testAny(inspectorMap, ofice) ? "inspector" : "";
}

function testAny(arr, str) {
    var result = false;
    arr.forEach(function(el) {
        if (~str.search(el)) result = true
    });
    return result;
}

function findRegion(d) {
    var regionsMap = {
            "Дніпропетровськ": ["дніпро"],
            "Донецьк": ["донец"],
            "Житомир": ["житомир"],
            "Закарпаття": ["закарпат", "ужгород"],
            "Запоріжжя": ["запорі"],
            "Івано-Франківськ": ["іванофранківськ", "івано-франківськ", "франківс"],
            "Київ": ["київ"],
            "Кіровоград": ["кировоград", "кіровоград"],
            "Севастополь": ["севастополь"],
            "Крим": [/крим\s/, /крим$/, "криму", "кримськ"],
            "Львів": ["львів", "львов"],
            "Миколаїв": ["миколаїв"],
            "Одеса": ["одес"],
            "Полтава": ["полтав"],
            "Рівне": ["рівне", "рівенськ", "рівного"],
            "Суми": ["суми", "сумськ"],
            "Тернопіль": ["тернопіль", "тернополя"],
            "Харків": ["харків", "харков", "харьк"],
            "Херсон": ["херсон"],
            "Хмельницький": ["хмельни"],
            "Черкаси": ["черкас"],
            "Чернигів": ["чернигів", "чернигов"],
            "Чернівці": ["чернов", "чернів"],
            "Луганськ": ["луганськ", "луганск"],
            "Вінниця": ["вінни"],
            "Луцьк": ["луць", "волин"]
        };
    var ofice = d.office.toLowerCase();
    var position = d.position.toLowerCase();
    for (var key in regionsMap) {
        if (testAny(regionsMap[key], ofice) || testAny(regionsMap[key], position)) {
            return key;
        }
    }
    return ""
}