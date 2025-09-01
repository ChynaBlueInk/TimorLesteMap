"use client"

import { useState, useEffect } from "react"

interface GeolocationState {
  coords: { lat: number; lng: number } | null
  loading: boolean
  error: string | null
  accuracy: number | null
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
  watch?: boolean
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    loading: false,
    error: null,
    accuracy: null,
  })

  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 300000, // 5 minutes
    watch = false,
  } = options

  const getCurrentPosition = () => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Geolocation is not supported by this browser",
      }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    const success = (position: GeolocationPosition) => {
      setState({
        coords: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        },
        loading: false,
        error: null,
        accuracy: position.coords.accuracy,
      })
    }

    const error = (error: GeolocationPositionError) => {
      let errorMessage = "Unable to retrieve your location"

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = "Location access denied by user"
          break
        case error.POSITION_UNAVAILABLE:
          errorMessage = "Location information is unavailable"
          break
        case error.TIMEOUT:
          errorMessage = "Location request timed out"
          break
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
    }

    const geoOptions = {
      enableHighAccuracy,
      timeout,
      maximumAge,
    }

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(success, error, geoOptions)
      return () => navigator.geolocation.clearWatch(watchId)
    } else {
      navigator.geolocation.getCurrentPosition(success, error, geoOptions)
    }
  }

  const requestLocation = () => {
    getCurrentPosition()
  }

  useEffect(() => {
    if (watch) {
      const cleanup = getCurrentPosition()
      return cleanup
    }
  }, [watch, enableHighAccuracy, timeout, maximumAge])

  return {
    ...state,
    requestLocation,
  }
}
