// Real integration with The Blue Alliance API

import type { Match, UpcomingMatch } from "./types"

const TBA_BASE_URL = "https://www.thebluealliance.com/api/v3"
const DEFAULT_API_KEY = "POPIu9LeBn7HvcO3WWSGSrJhH5cbRh39Ipi9XiL29TfBy9O8ianudl1OvwA78zxO"

// Helper function to make API requests to The Blue Alliance
async function tbaRequest(endpoint: string, apiKey?: string): Promise<any> {
  const headers: HeadersInit = {
    Accept: "application/json",
  }

  // Add API key if provided, otherwise use default
  headers["X-TBA-Auth-Key"] = apiKey || DEFAULT_API_KEY

  try {
    const response = await fetch(`${TBA_BASE_URL}${endpoint}`, { headers })

    if (!response.ok) {
      console.error(`TBA API error: ${response.status} ${response.statusText} for endpoint ${endpoint}`)
      throw new Error(`TBA API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching from TBA API:", error)
    throw error
  }
}

// Format event code to ensure it has the year prefix
function formatEventCode(eventCode: string): string {
  // If the event code already has a year prefix (e.g., "2023flta"), use it as is
  if (/^\d{4}[a-z0-9]+$/.test(eventCode.toLowerCase())) {
    return eventCode.toLowerCase()
  }

  // Otherwise, add the current year as a prefix
  const currentYear = new Date().getFullYear()
  return `${currentYear}${eventCode.toLowerCase()}`
}

// Check if an event is a championship event
function isChampionshipEvent(eventCode: string): boolean {
  // Championship events typically have "cmp" in their code or are division codes
  return (
    eventCode.includes("cmp") || eventCode.includes("cmptx") || eventCode.includes("cmpmi") || isDivisionCode(eventCode)
  )
}

// Check if an event code is a division code
function isDivisionCode(eventCode: string): boolean {
  // Extract the non-year part of the event code
  const codeWithoutYear = eventCode.replace(/^\d{4}/, "")

  // Check against known division codes
  const divisionCodes = [
    "arc", // Archimedes
    "cur", // Curie
    "dal", // Daly
    "gal", // Galileo
    "hop", // Hopper
    "joh", // Johnson
    "mil", // Milstein
    "new", // Newton
    "cars", // Carson
    "carv", // Carver
    "dar", // Darwin
    "roe", // Roebling
    "tur", // Turing,
  ]

  return divisionCodes.includes(codeWithoutYear.toLowerCase())
}

// Get division name from event code
function getDivisionFromEventCode(eventCode: string): string | undefined {
  // Extract the non-year part of the event code
  const codeWithoutYear = eventCode.replace(/^\d{4}/, "")

  const divisionMap: { [key: string]: string } = {
    arc: "Archimedes",
    cur: "Curie",
    dal: "Daly",
    gal: "Galileo",
    hop: "Hopper",
    joh: "Johnson",
    mil: "Milstein",
    new: "Newton",
    cars: "Carson",
    carv: "Carver",
    dar: "Darwin",
    roe: "Roebling",
    tur: "Turing",
    ein: "Einstein",
    cmptx: "Championship",
    cmpmi: "Championship",
  }

  // Check for exact matches first
  if (divisionMap[codeWithoutYear.toLowerCase()]) {
    return divisionMap[codeWithoutYear.toLowerCase()]
  }

  // If no exact match, try to find a partial match
  for (const [code, name] of Object.entries(divisionMap)) {
    if (codeWithoutYear.toLowerCase().includes(code)) {
      return name
    }
  }

  return undefined
}

// Get all possible division codes for a championship year
function getAllDivisionCodes(year: string): string[] {
  const divisionCodes = [
    "arc", // Archimedes
    "cur", // Curie
    "dal", // Daly
    "gal", // Galileo
    "hop", // Hopper
    "joh", // Johnson
    "mil", // Milstein
    "new", // Newton
  ]

  return divisionCodes.map((code) => `${year}${code}`)
}

// Update the match description formatting for Einstein matches
function convertTBAMatch(tbaMatch: any, teamNumber: string, eventCode: string, teamDivision?: string): Match {
  // Extract alliance information
  const redTeams = tbaMatch.alliances.red.team_keys.map((key: string) => key.replace("frc", ""))
  const blueTeams = tbaMatch.alliances.blue.team_keys.map((key: string) => key.replace("frc", ""))

  // Format match time
  let matchDate = "TBD"
  let matchTime = "TBD"

  if (tbaMatch.actual_time) {
    // Use actual time if available
    const date = new Date(tbaMatch.actual_time * 1000)
    matchDate = date.toLocaleDateString()
    matchTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } else if (tbaMatch.predicted_time) {
    // Use predicted time if available
    const date = new Date(tbaMatch.predicted_time * 1000)
    matchDate = date.toLocaleDateString()
    matchTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } else if (tbaMatch.time) {
    // Use scheduled time if available
    const date = new Date(tbaMatch.time * 1000)
    matchDate = date.toLocaleDateString()
    matchTime = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Determine match type
  let matchType = "Unknown"
  if (tbaMatch.comp_level === "qm") {
    matchType = "Qualification"
  } else if (tbaMatch.comp_level === "sf") {
    matchType = "Semifinal"
  } else if (tbaMatch.comp_level === "f") {
    matchType = "Final"
  } else if (tbaMatch.comp_level === "ef") {
    matchType = "Einstein"
  }

  // Check if this is an Einstein match based on the event key
  if (tbaMatch.event_key && tbaMatch.event_key.includes("cmptx")) {
    matchType = "Einstein"
  }

  // Create a more descriptive match description
  let description = `${matchType} Match ${tbaMatch.match_number}`

  // For playoff matches, include the set number
  if (matchType !== "Qualification" && matchType !== "Unknown") {
    if (matchType === "Semifinal") {
      description = `Semifinal ${tbaMatch.set_number}`
    } else if (matchType === "Final") {
      description = `Final Match ${tbaMatch.match_number}`
    } else if (matchType === "Einstein") {
      // Check if this is a final match
      if (
        tbaMatch.comp_level === "f" ||
        (tbaMatch.event_key && tbaMatch.event_key.includes("cmptx") && tbaMatch.comp_level === "f")
      ) {
        description = `Einstein Final ${tbaMatch.match_number}`
      } else if (
        tbaMatch.comp_level === "sf" ||
        (tbaMatch.event_key && tbaMatch.event_key.includes("cmptx") && tbaMatch.comp_level === "sf")
      ) {
        description = `Einstein Semifinal ${tbaMatch.match_number}`
      } else if (tbaMatch.comp_level === "ef") {
        if (tbaMatch.set_number === 1) {
          description = `Einstein Final ${tbaMatch.match_number}`
        } else {
          description = `Einstein Semifinal ${tbaMatch.match_number}`
        }
      } else {
        description = `Einstein Match ${tbaMatch.match_number}`
      }
    }
  }

  // Determine division
  let division = undefined

  // Check if this is a championship event
  const isChampionship = isChampionshipEvent(eventCode)

  if (isChampionship) {
    if (matchType === "Einstein" || (tbaMatch.event_key && tbaMatch.event_key.includes("cmptx"))) {
      division = "Einstein"
    } else if (teamDivision) {
      // Use the team's division for non-Einstein matches
      division = teamDivision
    } else {
      // Try to determine division from the match event key
      const matchEventKey = tbaMatch.event_key || eventCode
      division = getDivisionFromEventCode(matchEventKey)
    }
  }

  // Determine if match is completed and who won
  let isCompleted = false
  let winner = null

  if (
    tbaMatch.actual_time ||
    (tbaMatch.score_breakdown &&
      (tbaMatch.score_breakdown.red.totalPoints > 0 || tbaMatch.score_breakdown.blue.totalPoints > 0))
  ) {
    isCompleted = true

    if (tbaMatch.winning_alliance === "red") {
      winner = "red"
    } else if (tbaMatch.winning_alliance === "blue") {
      winner = "blue"
    } else if (tbaMatch.winning_alliance === "") {
      winner = "tie"
    }
  }

  // Get team ranking if available
  let teamRanking = undefined
  if (tbaMatch.team_rankings) {
    const teamKey = `frc${teamNumber}`
    const rankInfo = tbaMatch.team_rankings.find((r: any) => r.team_key === teamKey)
    if (rankInfo) {
      teamRanking = rankInfo.rank
    }
  }

  return {
    id: tbaMatch.key,
    matchNumber: tbaMatch.match_number,
    matchType: matchType,
    description: description,
    date: matchDate,
    time: matchTime,
    teams: {
      red: redTeams,
      blue: blueTeams,
    },
    division,
    winner,
    isCompleted,
    teamRanking,
  }
}

// Find which division a team is competing in at a championship
async function findTeamDivision(
  teamNumber: string,
  year: string,
  apiKey?: string,
): Promise<{
  divisionCode: string | null
  divisionName: string | null
}> {
  console.log(`Finding division for team ${teamNumber} at ${year} championship`)

  // Get all possible division codes for this year
  const divisionCodes = getAllDivisionCodes(year)

  // Try each division code until we find matches
  for (const divCode of divisionCodes) {
    try {
      console.log(`Checking division ${divCode}...`)
      const endpoint = `/team/frc${teamNumber}/event/${divCode}/matches`
      const matches = await tbaRequest(endpoint, apiKey)

      // If we found matches, this is the team's division
      if (matches && matches.length > 0) {
        const divisionName = getDivisionFromEventCode(divCode)
        console.log(`Found team ${teamNumber} in division ${divisionName} (${divCode})`)
        return {
          divisionCode: divCode,
          divisionName: divisionName || null,
        }
      }
    } catch (error) {
      // Continue to the next division if this one fails
      console.log(`No matches found in ${divCode}`)
    }
  }

  // If no division found
  console.log(`Could not find division for team ${teamNumber}`)
  return {
    divisionCode: null,
    divisionName: null,
  }
}

// Fetch matches for a team at a specific event
export async function fetchMatches(teamNumber?: string, eventCode?: string, apiKey?: string): Promise<Match[]> {
  if (!teamNumber || !eventCode) {
    console.log("Missing team number or event code, returning empty matches array")
    return []
  }

  try {
    // Format the event code to ensure it has the year prefix
    const formattedEventCode = formatEventCode(eventCode)
    console.log(`Fetching matches for team ${teamNumber} at event ${formattedEventCode}`)

    // Check if this is a championship event
    const isChampionship = isChampionshipEvent(formattedEventCode)
    console.log(`Is championship event: ${isChampionship}`)

    let allMatches: any[] = []
    let teamDivision: string | null = null

    // If this is a championship event
    if (isChampionship) {
      // Extract the year from the event code
      const year = formattedEventCode.substring(0, 4)

      // If the event code is for the main championship (not a specific division)
      if (formattedEventCode.includes("cmptx") || formattedEventCode.includes("cmpmi")) {
        // Find which division the team is competing in
        const divisionInfo = await findTeamDivision(teamNumber, year, apiKey)

        if (divisionInfo.divisionCode) {
          // Get matches from the team's division
          console.log(`Fetching division matches from ${divisionInfo.divisionCode}`)
          const divisionEndpoint = `/team/frc${teamNumber}/event/${divisionInfo.divisionCode}/matches`
          const divisionMatches = await tbaRequest(divisionEndpoint, apiKey)
          allMatches = [...allMatches, ...divisionMatches]
          teamDivision = divisionInfo.divisionName

          // Also try to get Einstein matches if they exist
          try {
            const einsteinEndpoint = `/team/frc${teamNumber}/event/${year}cmptx/matches`
            const einsteinMatches = await tbaRequest(einsteinEndpoint, apiKey)
            if (einsteinMatches && einsteinMatches.length > 0) {
              allMatches = [...allMatches, ...einsteinMatches]
            }
          } catch (error) {
            console.log("No Einstein matches found")
          }
        } else {
          // If we couldn't find the division, just try the main championship code
          const endpoint = `/team/frc${teamNumber}/event/${formattedEventCode}/matches`
          allMatches = await tbaRequest(endpoint, apiKey)
        }
      }
      // If the event code is already a specific division
      else if (isDivisionCode(formattedEventCode)) {
        // Get matches from this division
        const endpoint = `/team/frc${teamNumber}/event/${formattedEventCode}/matches`
        const divisionMatches = await tbaRequest(endpoint, apiKey)
        allMatches = [...allMatches, ...divisionMatches]
        teamDivision = getDivisionFromEventCode(formattedEventCode)

        // Also try to get Einstein matches if they exist
        try {
          const einsteinEndpoint = `/team/frc${teamNumber}/event/${year}cmptx/matches`
          const einsteinMatches = await tbaRequest(einsteinEndpoint, apiKey)
          if (einsteinMatches && einsteinMatches.length > 0) {
            allMatches = [...allMatches, ...einsteinMatches]
          }
        } catch (error) {
          console.log("No Einstein matches found")
        }
      }
    } else {
      // For regular events, just get matches normally
      const endpoint = `/team/frc${teamNumber}/event/${formattedEventCode}/matches`
      allMatches = await tbaRequest(endpoint, apiKey)
    }

    console.log(`Successfully fetched ${allMatches.length} matches from TBA API`)

    // Try to get team ranking
    let teamRanking
    try {
      // If we have a division code for a championship, use that for ranking
      const rankingEndpoint = `/team/frc${teamNumber}/event/${formattedEventCode}/status`
      const rankingData = await tbaRequest(rankingEndpoint, apiKey)
      if (rankingData && rankingData.qual && rankingData.qual.ranking) {
        teamRanking = rankingData.qual.ranking.rank
      }
    } catch (e) {
      console.warn("Could not fetch team ranking:", e)
    }

    // Sort matches by time
    allMatches.sort((a: any, b: any) => {
      // First sort by competition level
      const levelOrder: { [key: string]: number } = {
        qm: 1, // Qualification Match
        sf: 2, // Semifinal
        f: 3, // Final
        ef: 4, // Einstein Field
      }

      // If one is an Einstein match (from cmptx) and the other isn't, prioritize accordingly
      const aIsEinstein = a.event_key && a.event_key.includes("cmptx")
      const bIsEinstein = b.event_key && b.event_key.includes("cmptx")

      if (aIsEinstein && !bIsEinstein) return 1
      if (!aIsEinstein && bIsEinstein) return -1

      const levelDiff = levelOrder[a.comp_level] - levelOrder[b.comp_level]
      if (levelDiff !== 0) return levelDiff

      // Then sort by set number (for playoff matches)
      if (a.set_number !== undefined && b.set_number !== undefined) {
        const setDiff = a.set_number - b.set_number
        if (setDiff !== 0) return setDiff
      }

      // Then sort by match number
      const matchDiff = a.match_number - b.match_number
      if (matchDiff !== 0) return matchDiff

      // Finally sort by time if everything else is equal
      const timeA = a.actual_time || a.predicted_time || a.time || 0
      const timeB = b.actual_time || b.predicted_time || b.time || 0
      return timeA - timeB
    })

    // Convert to our app's format
    const matches = allMatches.map((match: any) =>
      convertTBAMatch(match, teamNumber, formattedEventCode, teamDivision || undefined),
    )

    // Add team ranking to all matches
    if (teamRanking) {
      matches.forEach((match) => {
        match.teamRanking = teamRanking
      })
    }

    return matches
  } catch (error) {
    console.error("Error fetching team matches:", error)
    console.log("Falling back to mock data")

    // Fallback to mock data if API fails
    return generateMockMatches(teamNumber, eventCode)
  }
}

// Fetch upcoming matches for a team at a specific event
export async function fetchUpcomingMatches(
  teamNumber?: string,
  eventCode?: string,
  apiKey?: string,
): Promise<UpcomingMatch[]> {
  if (!teamNumber || !eventCode) {
    return []
  }

  try {
    // Get all matches
    const allMatches = await fetchMatches(teamNumber, eventCode, apiKey)

    // Filter for upcoming matches (those without actual_time)
    const now = new Date()
    const upcomingMatches = allMatches
      .filter((match) => {
        if (match.date === "TBD") return true
        if (match.isCompleted) return false

        try {
          const matchDate = new Date(`${match.date} ${match.time}`)
          return matchDate > now
        } catch (e) {
          // If date parsing fails, include the match anyway
          return true
        }
      })
      .slice(0, 3)

    // Convert to UpcomingMatch format
    return upcomingMatches.map((match) => ({
      id: match.id,
      matchNumber: match.matchNumber,
      time: match.time === "TBD" ? "Time TBD" : match.time,
    }))
  } catch (error) {
    console.error("Error fetching upcoming matches:", error)

    // Fallback to mock data
    const mockMatches = generateMockMatches(teamNumber, eventCode).slice(0, 3)
    return mockMatches.map((match) => ({
      id: match.id,
      matchNumber: match.matchNumber,
      time: match.time,
    }))
  }
}

// Fetch events for the current season
export async function fetchEvents(apiKey?: string, teamNumber?: string): Promise<any[]> {
  try {
    // Get current year
    const currentYear = new Date().getFullYear()

    let endpoint = `/events/${currentYear}`

    // If team number is provided, get events for that team
    if (teamNumber) {
      endpoint = `/team/frc${teamNumber}/events/${currentYear}`
    }

    console.log(`Fetching events for ${teamNumber ? `team ${teamNumber}` : `year ${currentYear}`}`)

    const events = await tbaRequest(endpoint, apiKey)
    console.log(`Successfully fetched ${events.length} events from TBA API`)

    // Sort events by start date
    events.sort((a: any, b: any) => {
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    })

    // Format events for our app
    return events.map((event: any) => ({
      id: event.key,
      name: event.short_name || event.name,
      date: new Date(event.start_date).toLocaleDateString(),
    }))
  } catch (error) {
    console.error("Error fetching events:", error)
    console.log("Falling back to mock events")

    // Return mock events if API fails
    return [
      { id: "2024flta", name: "Tallahassee Regional", date: "2024-03-04" },
      { id: "2024flor", name: "Orlando Regional", date: "2024-03-11" },
      { id: "2024flmi", name: "Miami Regional", date: "2024-03-18" },
      { id: "2024txhou", name: "Houston Championship", date: "2024-04-19" },
    ]
  }
}

// Fallback mock data generator
function generateMockMatches(teamNumber: string, eventCode: string): Match[] {
  // This function generates mock matches for the specified team and event
  // Used as a fallback when the API is unavailable
  console.log(`Generating mock matches for team ${teamNumber} at event ${eventCode}`)

  const matches: Match[] = []
  const isChampionship = isChampionshipEvent(eventCode)

  // Determine division for championship events
  let teamDivision: string | undefined = undefined

  if (isChampionship) {
    // If the event code is a division code, use that division
    if (isDivisionCode(eventCode)) {
      teamDivision = getDivisionFromEventCode(eventCode)
    } else {
      // Otherwise, assign a random division
      const divisions = ["Archimedes", "Galileo", "Hopper", "Newton"]
      teamDivision = divisions[0]
    }
  }

  console.log(`Team division: ${teamDivision || "None (Regional Event)"}`)

  // Generate qualification matches
  for (let i = 1; i <= 8; i++) {
    const matchNumber = i
    const date = "2024-03-04"
    const time = `${9 + Math.floor(i / 2)}:${i % 2 === 0 ? "30" : "00"} AM`
    const isCompleted = i <= 4 // First 4 matches are completed

    // Generate random team numbers, but always include the specified team
    const redTeams = i % 2 === 0 ? [teamNumber] : []
    const blueTeams = i % 2 === 1 ? [teamNumber] : []

    // Add random teams to fill out the alliance
    while (redTeams.length < 3) {
      const randomTeam = Math.floor(Math.random() * 9000) + 1000
      redTeams.push(randomTeam.toString())
    }

    while (blueTeams.length < 3) {
      const randomTeam = Math.floor(Math.random() * 9000) + 1000
      blueTeams.push(randomTeam.toString())
    }

    // Determine winner for completed matches
    let winner = null
    if (isCompleted) {
      if (i % 3 === 0) {
        winner = "tie"
      } else if (redTeams.includes(teamNumber)) {
        winner = "red" // Team wins when on red alliance
      } else if (blueTeams.includes(teamNumber)) {
        winner = "blue" // Team wins when on blue alliance
      } else {
        winner = Math.random() > 0.5 ? "red" : "blue"
      }
    }

    matches.push({
      id: `${eventCode}_qm${matchNumber}`,
      matchNumber,
      matchType: "Qualification",
      description: `Qualification Match ${matchNumber}`,
      date,
      time,
      teams: {
        red: redTeams,
        blue: blueTeams,
      },
      division: teamDivision,
      isCompleted,
      winner,
      teamRanking: 12, // Mock team ranking
    })
  }

  // Generate semifinal matches
  for (let set = 1; set <= 2; set++) {
    for (let match = 1; match <= 2; match++) {
      const date = "2024-03-05"
      const time = `${1 + set}:${match === 1 ? "00" : "30"} PM`
      const isCompleted = set === 1 && match === 1

      // Generate random team numbers
      const redTeams = []
      const blueTeams = []

      // For the first semifinal, include the team
      if (set === 1 && match === 1) {
        redTeams.push(teamNumber)
      }

      // Add random teams to fill out the alliances
      while (redTeams.length < 3) {
        const randomTeam = Math.floor(Math.random() * 9000) + 1000
        redTeams.push(randomTeam.toString())
      }

      while (blueTeams.length < 3) {
        const randomTeam = Math.floor(Math.random() * 9000) + 1000
        blueTeams.push(randomTeam.toString())
      }

      // Determine winner for completed matches
      let winner = null
      if (isCompleted) {
        winner = redTeams.includes(teamNumber) ? "red" : "blue"
      }

      matches.push({
        id: `${eventCode}_sf${set}m${match}`,
        matchNumber: match,
        matchType: "Semifinal",
        description: `Semifinal ${set}`,
        date,
        time,
        teams: {
          red: redTeams,
          blue: blueTeams,
        },
        division: teamDivision,
        isCompleted,
        winner,
        teamRanking: 12,
      })
    }
  }

  // Generate final matches
  for (let match = 1; match <= 2; match++) {
    const date = "2024-03-05"
    const time = `${4}:${match === 1 ? "00" : "30"} PM`
    const isCompleted = match === 1

    // Generate random team numbers
    const redTeams = []
    const blueTeams = []

    // For the first final match, include the team
    if (match === 1) {
      redTeams.push(teamNumber)
    }

    // Add random teams to fill out the alliances
    while (redTeams.length < 3) {
      const randomTeam = Math.floor(Math.random() * 9000) + 1000
      redTeams.push(randomTeam.toString())
    }

    while (blueTeams.length < 3) {
      const randomTeam = Math.floor(Math.random() * 9000) + 1000
      blueTeams.push(randomTeam.toString())
    }

    // Determine winner for completed matches
    let winner = null
    if (isCompleted) {
      winner = redTeams.includes(teamNumber) ? "red" : "blue"
    }

    matches.push({
      id: `${eventCode}_f1m${match}`,
      matchNumber: match,
      matchType: "Final",
      description: `Final Match ${match}`,
      date,
      time,
      teams: {
        red: redTeams,
        blue: blueTeams,
      },
      division: teamDivision,
      isCompleted,
      winner,
      teamRanking: 12,
    })
  }

  // For championship events, add Einstein matches
  if (isChampionship) {
    for (let match = 1; match <= 2; match++) {
      const date = "2024-03-06"
      const time = `${2}:${match === 1 ? "00" : "30"} PM`
      const isCompleted = false

      // Generate random team numbers
      const redTeams = []
      const blueTeams = []

      // Add random teams to fill out the alliances
      while (redTeams.length < 3) {
        const randomTeam = Math.floor(Math.random() * 9000) + 1000
        redTeams.push(randomTeam.toString())
      }

      while (blueTeams.length < 3) {
        const randomTeam = Math.floor(Math.random() * 9000) + 1000
        blueTeams.push(randomTeam.toString())
      }

      matches.push({
        id: `${eventCode}_ef1m${match}`,
        matchNumber: match,
        matchType: "Einstein",
        description: `Einstein Final ${match}`,
        date,
        time,
        teams: {
          red: redTeams,
          blue: blueTeams,
        },
        division: "Einstein",
        isCompleted,
        winner: null,
        teamRanking: 12,
      })
    }
  }

  return matches
}
