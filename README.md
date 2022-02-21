# FriendsJS
## A NodeJS class for storing and searching your contact information
FriendsJS constructs an indexexed database of contact information, such as email addresses and phone numbers. This enables real-time searching, either by a person's name or by their contact information.
## Installation
FriendsJS can be installed with NPM:
```
npm install friends-js
```

## Usage
```js
const Indexer = require("friends-js");

const myContacts = new Indexer("./contactInfo.json");

myContacts.add("John Doe @johnd");
myContacts.add("John Doe johnd@hotmail.com");

myContacts.add("Jane Doe @janed");

const result1 = myContacts.search("John");
console.log(result1);
// [
//    { name: 'John Doe', socials: [ '@johnd' ], emails: [ 'johnd@hotmail.com' ] },
// ]

const result2 = myContacts.search("Doe");
console.log(result2);
// [
//    { name: 'John Doe', socials: [ '@johnd' ], emails: [ 'johnd@hotmail.com' ] },
//    { name: 'Jane Doe', socials: [ '@janed' ] }
// ]

myContacts.remove("@johnd");
const result3 = myContacts.search("Doe");
console.log(result3);
// [
//    { name: 'Jane Doe', socials: [ '@janed' ] }
// ]

myContacts.save();
```