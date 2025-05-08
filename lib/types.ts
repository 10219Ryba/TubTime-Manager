export interface Battery {
  id: string
  voltage: number
  capacity: number
  dateAdded: string
  brand?: string
  comments?: BatteryComment[]
  isFaulty?: boolean
}

export interface BatteryComment {
  matchId: string
  text: string
  timestamp: string
}

export interface BatteryAssignment {
  matchId: string
  batteryId: string
  timestamp: string
}

export interface Match {
  id: string
  matchNumber: number
  matchType: string
  description: string
  date: string
  time: string
  teams: {
    red: string[]
    blue: string[]
  }
  division?: string
  winner?: "red" | "blue" | "tie" | null
  teamRanking?: number
  isCompleted?: boolean
}

export interface UpcomingMatch {
  id: string
  matchNumber: number
  time: string
  assignedBattery?: string
}

export interface AppSettings {
  teamNumber: string
  eventCode: string
  apiKey: string
  darkMode: boolean
}
