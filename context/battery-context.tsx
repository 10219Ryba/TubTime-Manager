"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { Battery, BatteryAssignment, BatteryComment, AppSettings } from "@/lib/types"

interface BatteryContextType {
  batteries: Battery[]
  assignments: BatteryAssignment[]
  settings: AppSettings
  addBattery: (battery: Battery) => void
  removeBattery: (id: string) => void
  assignBatteryToMatch: (matchId: string, batteryId: string) => void
  unassignBattery: (matchId: string) => void
  getBatteryComments: (batteryId: string) => BatteryComment[]
  addBatteryComment: (batteryId: string, comment: BatteryComment) => void
  updateSettings: (newSettings: AppSettings) => void
  markBatteryFaulty: (batteryId: string, isFaulty: boolean) => void
}

const BatteryContext = createContext<BatteryContextType | undefined>(undefined)

// Default settings
const defaultSettings: AppSettings = {
  teamNumber: "10219",
  eventCode: "",
  apiKey: "",
  darkMode: true,
}

export function BatteryProvider({ children }: { children: ReactNode }) {
  const [batteries, setBatteries] = useState<Battery[]>([])
  const [assignments, setAssignments] = useState<BatteryAssignment[]>([])
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)

  // Load data from localStorage on initial render
  useEffect(() => {
    const storedBatteries = localStorage.getItem("frc-batteries")
    const storedAssignments = localStorage.getItem("frc-battery-assignments")
    const storedSettings = localStorage.getItem("frc-app-settings")

    if (storedBatteries) {
      setBatteries(JSON.parse(storedBatteries))
    }

    if (storedAssignments) {
      setAssignments(JSON.parse(storedAssignments))
    }

    if (storedSettings) {
      setSettings(JSON.parse(storedSettings))
    }
  }, [])

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("frc-batteries", JSON.stringify(batteries))
  }, [batteries])

  useEffect(() => {
    localStorage.setItem("frc-battery-assignments", JSON.stringify(assignments))
  }, [assignments])

  useEffect(() => {
    localStorage.setItem("frc-app-settings", JSON.stringify(settings))

    // Apply dark mode setting
    if (settings.darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [settings])

  const addBattery = (battery: Battery) => {
    setBatteries((prev) => [...prev, battery])
  }

  const removeBattery = (id: string) => {
    setBatteries((prev) => prev.filter((battery) => battery.id !== id))
    // Also remove any assignments for this battery
    setAssignments((prev) => prev.filter((assignment) => assignment.batteryId !== id))
  }

  const assignBatteryToMatch = (matchId: string, batteryId: string) => {
    // Remove any existing assignment for this match
    const filteredAssignments = assignments.filter((a) => a.matchId !== matchId)

    // Add the new assignment
    setAssignments([...filteredAssignments, { matchId, batteryId, timestamp: new Date().toISOString() }])
  }

  const unassignBattery = (matchId: string) => {
    setAssignments((prev) => prev.filter((assignment) => assignment.matchId !== matchId))
  }

  const getBatteryComments = (batteryId: string): BatteryComment[] => {
    const battery = batteries.find((b) => b.id === batteryId)
    return battery?.comments || []
  }

  const addBatteryComment = (batteryId: string, comment: BatteryComment) => {
    setBatteries((prev) =>
      prev.map((battery) => {
        if (battery.id === batteryId) {
          return {
            ...battery,
            comments: [...(battery.comments || []), comment],
          }
        }
        return battery
      }),
    )
  }

  const updateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings)
  }

  const markBatteryFaulty = (batteryId: string, isFaulty: boolean) => {
    setBatteries((prev) =>
      prev.map((battery) => {
        if (battery.id === batteryId) {
          return {
            ...battery,
            isFaulty,
          }
        }
        return battery
      }),
    )
  }

  return (
    <BatteryContext.Provider
      value={{
        batteries,
        assignments,
        settings,
        addBattery,
        removeBattery,
        assignBatteryToMatch,
        unassignBattery,
        getBatteryComments,
        addBatteryComment,
        updateSettings,
        markBatteryFaulty,
      }}
    >
      {children}
    </BatteryContext.Provider>
  )
}

export function useBatteryContext() {
  const context = useContext(BatteryContext)
  if (context === undefined) {
    throw new Error("useBatteryContext must be used within a BatteryProvider")
  }
  return context
}
