const { Console } = require('console');
const fs = require('fs');
const util = require('util');

class Indexer {

    //#region Public Functions

    //Indexer Constructor
    //@param {string} filePath - Path to the .json file that stores the data and index.
    //@param {int} maxQueries - The maximum number of results to return for a search.
    constructor(filePath, maxQueries = 10) {
        this.filePath = filePath;
        if (!fs.existsSync(filePath)) {
            this.obj = {
                "maxLength": 0,
                "data": {},
                "index": {}
            };
            fs.writeFile(filePath, JSON.stringify(this.obj), function (err) {
                if (err) throw err;
                console.log("New Index created");
            });
        }
        else this.obj = JSON.parse(fs.readFileSync(filePath));
        this.result = new Set();
        this.maxQueries = maxQueries;
    }

    //Save the index and data to their respective files
    //@param {boolean} prettyPrint - Whether the JSON output should be automatically formatted.
    save(prettyPrint = false) {
        if (prettyPrint) fs.writeFileSync(this.filePath, JSON.stringify(this.obj, null, "\t"));
        else fs.writeFileSync(this.filePath, JSON.stringify(this.obj));
    }

    //Print an expanded version of the index to the console
    printIndex() {
        console.log(util.inspect(this.obj.index, { showHidden: false, depth: null, colors: true, compact: true }))
    }

    //Print an expanded version of the data to the console
    printIndex() {
        console.log(util.inspect(this.obj.data, { showHidden: false, depth: null, colors: true, compact: true }))
    }

    //Search the index for a query. Returns an array of objects. 
    //You can search for a contact by any property, including their name and any additional contact info.
    //Each object contains a name property and any additional contact info arrays, including 'aliases', 'emails', 'socials', and 'numbers'.
    //@param {string} query - The query to search for.
    //@param {int} max - The maximum number of results to return. Defaults to the maxQueries property.
    search(query, max) {
        if (max == undefined) max = this.maxQueries;
        if (query === "") return [];
        if (query.length > this.obj.data.maxLength) return [];
        let index = 0;
        let current = this.obj.index;
        while (index < query.length) {
            if (current == null || !(query.charAt(index) in current)) {
                return [];
            }
            current = current[query.charAt(index)];
            index++;
        }
        this.result = new Set();
        this.eachRecursive(current, max);
        const dataArr = [];
        this.result.forEach(entry => {
            dataArr.push({ ...this.obj.data[entry], "name": entry });
        });
        return dataArr;
    }

    //Add a new contact to the index and data.
    //@param {string} input - The name and any additional contact info to add. The input is processed as a space-separated string, with the first word(s) being the name.
    add(input) {
        input = input.replace("  ", " ");
        const values = input.split(' ');
        if (values.length == 0) return;
        let key = "";
        let keyIsDone = false;
        let val = null;
        const valuesToIndex = [];
        for (let index = 0; index < values.length; index++) {
            if (values[index] === "") continue;
            let type = this.checkWordType(values[index]);
            if (type == "words" && !keyIsDone) {
                if (key != "") key += " ";
                key += values[index];
            }
            else {
                if (type == "words") type = "aliases";
                if (!keyIsDone) { //End of keys
                    if (key in this.obj.data) val = this.obj.data[key];
                    else val = {};
                }
                keyIsDone = true;
                if (type == "space") continue;
                valuesToIndex.push(values[index]);
                if (!(type in val)) val[type] = [values[index]];
                else if (!val[type].includes(values[index])) {
                    val[type].push(values[index]);
                }
                else valuesToIndex.pop();
            }
        }
        valuesToIndex.forEach(value => {
            this.obj.index = this.addToIndex(value, key, this.obj.index, 0);
        });
        if (!(key in this.obj.data)) {
            if (key.length > this.obj.data.maxLength) this.obj.data.maxLength = key.length;
            const splitKey = key.split(' ');
            for (let i = 1; i < splitKey.length; i++)
                this.obj.index = this.addToIndex(splitKey[i], key, this.obj.index, 0);
            this.obj.index = this.addToIndex(key, key, this.obj.index, 0);
        }
        this.obj.data[key] = val;
    }

    //Remove a query from the index and data.
    //@param {string} query - The query to search for and remove.
    remove(query) {
        const searchArray = this.search(query, 1);
        if (searchArray.length == 0) return;
        const obj = searchArray[0];
        const fKey = obj.name;
        if (!(fKey in this.obj.data)) return;
        const splitKey = fKey.split(' ');
        for (let i = 1; i < splitKey.length; i++)
            this.obj.index = this.removeFromIndex(splitKey[i], fKey, this.obj.index, 0);
        Object.keys(obj).forEach(element => {
            if (element !== "name") {
                obj[element].forEach(item => {
                    this.obj.index = this.removeFromIndex(item, fKey, this.obj.index, 0);
                });
            }
        });
        this.obj.index = this.removeFromIndex(query, fKey, this.obj.index, 0);
        if (this.obj.index == null) this.obj.index = { "nn": 0 };
    }
    //#endregion

    //#region Helper Functions

    //Check what category a word belongs to
    checkWordType(word) {
        if (word == "/") {
            return "space";
        }
        if (word.charAt(0) == "@") {
            return "socials";
        }
        if (word.includes("@")) {
            return "emails";
        }
        if (!isNaN(word)) {
            return "numbers";
        }
        return "words";
    }

    //Helper method for adding a new word to the index.
    addToIndex(key, value, obj, index) {
        if (!("nn" in obj)) obj.nn = 1;
        else obj.nn++;
        if (index == key.length) {
            if (!("results" in obj)) obj.results = [value];
            else obj.results.push(value);
            return obj;
        }
        if (!(key.charAt(index) in obj)) obj[key.charAt(index)] = {};
        obj[key.charAt(index)] = this.addToIndex(key, value, obj[key.charAt(index)], index + 1);
        return obj;
    }

    //Helper method for removing a word from the index.
    removeFromIndex(key, value, obj, index) { //MUST guarantee that key exists
        if (obj == null || (index < key.length && !(key.charAt(index) in obj))) return obj;
        if (obj.nn == 1) {
            delete obj[key.charAt(index)];
            return null;
        }
        obj.nn--;
        if (index == key.length) {
            if ("results" in obj) {
                if (obj.results.length == 1) delete obj.results;
                else obj.results.splice(obj.results.indexOf(value), 1);
            }
            return obj;
        }
        obj[key.charAt(index)] = this.removeFromIndex(key, value, obj[key.charAt(index)], index + 1);
        return obj;
    }

    //Helper method for recursively searching through a subset of the index to find all matches.
    eachRecursive(obj, max) {
        for (let k of Object.keys(obj)) {
            if (this.result.size >= max) break;
            if (typeof obj[k] == "object" && obj[k] !== null) this.eachRecursive(obj[k], max);
            else if (k != "nn") {
                this.result.add(obj[k]);
            }
        }
    }
    //#endregion
}

module.exports = Indexer;