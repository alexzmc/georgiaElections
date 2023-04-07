# Coding portion
To run code:
1. in the directory run `npm i` to install playwright . 
2. Presently I have the function being called in qualifiedCandidates.js.  Also included a script in package json `npm run candidates`.   Right now there is no date being passed in, to see specific date pass in a date in format `YYYY-MM-DD`.  
3. run node qualifiedCandidates.js

note- for return value said return 'JSON object'... I was not sure if you meant a javascript object that matched a JSON object or if you wanted the object stringified... I have it stringified/in the nice format so it will be easy to read in console.  
other note- scraping from: https://mvp.sos.ga.gov/s/qualifying-candidate-information since it seems that the other site is down.  


# Provided Instructions: 
Write a piece of code that scrapes the website for qualified candidates in Georgia and returns a list of those
candidates, for an election happening on a specified date.
Details:
1. The function should accept an optional parameter of an election date.
2. The function should visit this website: https://elections.sos.ga.gov/GAElection/CandidateDetails
3. It should pull up the candidate list for the election date given, or the most recent election date if none
was given.
4. It should take these candidates / races and turn them into a JSON object. You do not have to do any
standardization or cleaning of the data fields.
5. This JSON object should be returned by the function.
6. The final JSON object should be an array of races. Each race should have a subfield of candidates,
which is an array of candidates who have qualified for that race.
Notes:
1. The code should be written in Node.js, unless you have a good reason to write it in another language.
2. For web scraping, we use this library: https://playwright.dev/. It is fast, lightweight, and has a good
developer experience. You do not have to use this library, but it might be a good starting point.
3. The code should be a function, not a rest API. The function can always be wrapped in an API if needed.
4. The final code should be a polished, working product. I’ll be looking at readability, so be sure to name
variables well and include comments where necessary.