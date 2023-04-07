
const playwright = require("playwright")

/**
 * A function that scrapes the mvp site for qualifying candidates for Georgia's election.
 * @param { String } date as string in YYYY-MM-DD format
 * @returns a JSON object that is an array of races, where each race has subfield of candidates which is an array of the candidates who have qualified for tht race
 */
const georgiaCandidates = async (date = null) => { 
  try {
    // launch browser, go to page
    const browser = await playwright.chromium.launch({ headless: false })
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('https://mvp.sos.ga.gov/s/qualifying-candidate-information')

    // set timeout max to 7s so error will be thrown if an element cannot be located or clicked within this time.  The errors reference what locator was not found, making for easier debugging if a change to the site breaks the scraper.
    context.setDefaultTimeout(7000);

    let year, month, day
    if (typeof date === 'string') {
      // check if a date is passed in that it matches the format 
      if (!/\d{4}-\d{2}-\d{2}/.test(date)) throw new Error('format for date string should be YYYY-MM-DD')
      const splitDate = date.split('-')
      year = splitDate[0]
      month = String(Number(splitDate[1]))
      day = String(Number(splitDate[2]))
    } else if (date) { // throw an error for any truthy values that are not strings
      throw new Error('date needs to be YYYY-MM-DD string or instance of Date')
    }
  
    // select election year.  Find the label with Election Year, then find corresponding button with the Id it is for.  Clicking that button displays the dropdown with the years
    const yearDropdownLabel = await page.locator('label:text-is("Election Year")')
    const correspondingYearButtonId = await yearDropdownLabel.evaluate(async(label) => {
      return label.htmlFor
    })
    const dateSelector = await page.locator(`#${ correspondingYearButtonId } `) 
    await dateSelector.click()
    const yearIdNumber = correspondingYearButtonId.split('-')[2]
    const yearDropdownSelector = await page.locator(`#dropdown-element-${ yearIdNumber }`)
    // options in the year dropdown
    const yearOptions = await yearDropdownSelector.getByRole('option')
    if (!year) { // if no date is selected, choose the last (most recent) year in the dropdown .  
      year = await yearOptions.nth(0).textContent() // maybe nth not the best-- fix this in refactor
    }
    // select year from the year dropdown
    await yearDropdownSelector.getByText(year).click()
    
    // for this site- the dropdown dates use YYYY and month/day/year where any 0s padding front of digits is gone
    let dateString = date ? `${ month }/${ day }/${ year }` : ''

    const electionDropdownLabel = await page.locator('label:text-is("Election")')
    const correspondingButtonId = await electionDropdownLabel.evaluate(async(label) => {
      return label.htmlFor
    })

    const electionSelector = await page.locator(`#${ correspondingButtonId }`) // need await?
    await electionSelector.click()
    const idNumber = correspondingButtonId.split('-')[2]
    const electionDropdownSelector = await page.locator(`#dropdown-element-${ idNumber }`)
    let electionOptions = await electionDropdownSelector.getByRole('option')

    if (!date) {  // if no date provided, need to grab the 'most recent' from the dropdown, which is newest date that is <= current date
      const currentDate = new Date()
      const MM = currentDate.getMonth() + 1
      const DD = currentDate.getDate()
      const YYYY = currentDate.getFullYear()
      const compareDate = `${YYYY}/${String(MM).padStart(2, '0')}/${String(DD).padStart(2, '0')}`
      const optionsText = await electionOptions.allInnerTexts()
      for (let i = 0; i < optionsText.length; i++ ) {
        const textDate = optionsText[i].split(' -')[0]
        const [ textMonth, textDay, textYear ] = textDate.split('/')
        const compareString = `${ textYear }/${String(textMonth).padStart(2, '0') }/${String(textDay).padStart(2, '0') }`
        if (compareString <= compareDate) {
          dateString = textDate
          break
        } else if (i === optionsText.length - 1) { // if there are no elections for current year that have happened, need to change the year selector back a year, and then grab the newest of those election options
          const pastYear = YYYY - 1
          await yearDropdownLabel.click()
          await dateSelector.click()
          // select year from the year dropdown
          await yearDropdownSelector.getByText(pastYear).click()
          await electionSelector.click()
          await electionDropdownSelector.click()
          electionOptions = await electionDropdownSelector.getByRole('option') // get the new options
          const pastYearOptionsText = electionOptions.nth(0).textContent()
          dateString = pastYearOptionsText.split(' -')
        }
      }
    }
    // more than one election can occur for a specified date, so get all of the elections that match the date
    const filteredElectionOptions = await electionOptions.filter({ hasText: dateString})  

    if (!await filteredElectionOptions.count()) {
      throw new Error('no election exists for this date')
    }
    // since multiple elections can occur on same day, will need to list them so they can be iterated on if more than 1 exists for same day
    const filteredElectionOptionsList = await filteredElectionOptions.all()
    // close dropdown before loop
    await electionSelector.click() 

    // From looking at network tab- You can see that http response comes in in JSON format, which can easily be intercepted.  When clicking on the election, an array of races comes back with the name of each race in string form.  When click the view qualified candidates button, an object comes back with the different races as keys, and an array of candidates, with the keys and values for the different traits.  Since the json data is available returning is less likely to be altered than the page layout/selectors needed to get data directly from HTML, so therefore it is more stable and for this case its best to grab the data directly.  
    const responseKeys = [] // will hold a set of race names that come in through one of the responses
    const responseJsons = [] // will hold JSONs that come through responses, with information about specific races

    // function to parse through the JSON data in the response
    // in the below loop, the election option will be clicked which brings back an array of the different race names, and then the view qualified candidates button will be clicked which brings back an object with the races and candidate information.  This function also puts the race names in a keys array to use for validation, and the race objects into an array wth the detailed information. 
    const parseResponse = async (response) => {
      if (!response.url().includes('aura')) return null
        const jsonResponse = await response.json()
        const jsonReturnValue = jsonResponse.actions[0]?.returnValue?.returnValue
        if (Array.isArray(jsonReturnValue) && jsonReturnValue.every(e => typeof e === 'string')) {
          responseKeys.push(jsonReturnValue)
        } else if (jsonReturnValue && typeof jsonReturnValue === 'object' && Object.keys(jsonResponse).length) {
          responseJsons.push(jsonReturnValue)
        }
        return jsonReturnValue    
      }
    // add event listener to sort through responses while the dropwon and view candidates are being clicked 
    page.on('response', parseResponse)
    for (const option of filteredElectionOptionsList) { 
      // open drop down
      await electionSelector.click()
      // click on election option
      await option.click()
      // click button to view qualfied candidates
      const qualifiedCandidatesLink = await page.getByText(/view\squalified\scandidate/i)
      await qualifiedCandidatesLink.click() // make this regex // need error here if not exist in certain time frame
    }
    await page.waitForTimeout(4000)
    // turn off event listener
    page.off('response', parseResponse) 

    // here need to validate the response objects against the keys, since the urls of the responses are not indicative of what type of response it is, in case a response comes back that does not belong here.  Note- the list of race names that comes back as an array of strings has way more options, which may indicate races that exist for an election but do not have complete information on this site.  
    const allKeys = responseKeys.flat()
    const arrayOfRaces = []
    responseJsons.forEach(electionObject => {
      Object.keys(electionObject)
        .filter(key => allKeys.includes(key))
        .forEach(key => {
          const raceObj = { race: key, candidates: electionObject[key] }
          arrayOfRaces.push(raceObj)
        })
    })  
    // close browser and return JSON
    await page.waitForTimeout(1000)
    await browser.close()
    return JSON.stringify(arrayOfRaces, null, 2)
  } catch (err) {
    console.log(err)
  }
}

georgiaCandidates().then(x => console.log(x))