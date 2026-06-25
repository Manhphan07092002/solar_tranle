import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, DesignState, MapConfig } from '../../../types';
import { WEATHER_STATIONS } from '../../../constants';
import { fetchSolarData } from '../../../services/weatherService';
import { getDistanceKm } from '../../../utils/helpers';

export function useSetup(
    project: Project,
    designData: DesignState,
    setDesignData: React.Dispatch<React.SetStateAction<DesignState>>
) {
    const defaultAddress = "";
    const [searchAddr, setSearchAddr] = useState(designData.projectDetails?.address || project.address || defaultAddress);
    const [projectName, setProjectName] = useState(designData.projectDetails?.name || project.name || '');
    const [targetLocation, setTargetLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [city, setCity] = useState(designData.projectDetails?.city || '');
    const [zipCode, setZipCode] = useState(designData.projectDetails?.zipCode || '');
    const [isLoadingWeather, setIsLoadingWeather] = useState(false);
    const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'success' | 'error'>('idle');
    const [searchFeedback, setSearchFeedback] = useState<string>("");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const suggestionTimeoutRef = useRef<NodeJS.Timeout>();

    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        grid: false,
        customer: true,
        notes: true
    });
    const [customerData, setCustomerData] = useState(designData.customer || {
        firstName: '',
        lastName: '',
        email: 'pxmanhctc@gmail.com',
        company: ''
    });
    const [gridData, setGridData] = useState(designData.grid || {
        gridType: '400V L-L, 230V L-N',
        powerFactor: '1',
        exportLimit: false
    });
    const [notes, setNotes] = useState(designData.notes || '');
    const [selectedStationId, setSelectedStationId] = useState<string>(designData.projectDetails?.selectedStationId || '');

    // Sync state to designData
    useEffect(() => {
        setDesignData(prev => ({
            ...prev,
            customer: customerData,
            grid: gridData,
            notes: notes,
            projectDetails: {
                ...prev.projectDetails,
                address: searchAddr,
                city: city,
                zipCode: zipCode,
                selectedStationId: selectedStationId,
                name: projectName
            }
        }));
    }, [customerData, gridData, notes, searchAddr, city, zipCode, selectedStationId, projectName]);

    // Auto-select nearest station
    useEffect(() => {
        if (WEATHER_STATIONS.length === 0) return;
        const loc = targetLocation || (designData.mapConfig ? { lat: designData.mapConfig.lat, lng: designData.mapConfig.lng } : null);
        if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) {
            if (!selectedStationId) setSelectedStationId(WEATHER_STATIONS[0].id);
            return;
        }

        let nearestId = WEATHER_STATIONS[0].id;
        let minDist = Infinity;
        for (const station of WEATHER_STATIONS) {
            const dist = getDistanceKm(loc.lat, loc.lng, station.lat, station.lng);
            if (dist < minDist) {
                minDist = dist;
                nearestId = station.id;
            }
        }
        if (nearestId !== selectedStationId) setSelectedStationId(nearestId);
    }, [targetLocation, designData.mapConfig, selectedStationId]);

    // Geocoding
    const geocodeAddress = useCallback(async (address: string) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
                { headers: { 'User-Agent': 'SolarPVDesigner/1.0' } }
            );
            if (!response.ok) return null;
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) return null;
            const data = await response.json();
            if (data && data.length > 0) {
                const place = data[0];
                return {
                    lat: parseFloat(place.lat),
                    lng: parseFloat(place.lon),
                    displayName: place.display_name,
                    address: place.address
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }, []);

    // Reverse geocoding
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                { headers: { 'User-Agent': 'SolarPVDesigner/1.0' } }
            );
            if (!response.ok) return { displayName: 'Current Location', address: {} };
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) return { displayName: 'Current Location', address: {} };
            const data = await response.json();
            return { displayName: data.display_name || 'Current Location', address: data.address || {} };
        } catch (error) {
            console.warn('Reverse geocoding failed (non-critical):', error);
            return { displayName: 'Current Location', address: {} };
        }
    }, []);

    // Autocomplete
    const fetchSuggestions = useCallback(async (query: string) => {
        if (query.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        setIsLoadingSuggestions(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
                { headers: { 'User-Agent': 'SolarPVDesigner/1.0' } }
            );
            if (!response.ok) return;
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) return;
            const data = await response.json();
            setSuggestions(data);
            setShowSuggestions(data.length > 0);
        } catch (error) {
            console.error('Autocomplete error:', error);
            setSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsLoadingSuggestions(false);
        }
    }, []);

    const handleSearchInputChange = useCallback((value: string) => {
        setSearchAddr(value);
        if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
        suggestionTimeoutRef.current = setTimeout(() => {
            fetchSuggestions(value);
        }, 500);
    }, [fetchSuggestions]);

    const handleSuggestionClick = useCallback((suggestion: any) => {
        const loc = { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) };
        setTargetLocation(loc);
        setSearchAddr(suggestion.display_name);
        setShowSuggestions(false);
        setSearchStatus('success');
        setSearchFeedback("Location found.");
    }, []);

    const handleManualSearch = useCallback(async () => {
        if (!searchAddr.trim()) return;
        setSearchStatus('searching');
        setSearchFeedback("");
        const result = await geocodeAddress(searchAddr);
        if (result) {
            setTargetLocation({ lat: result.lat, lng: result.lng });
            setSearchAddr(result.displayName);
            if (result.address) {
                setCity(result.address.city || result.address.town || result.address.village || result.address.state || '');
                setZipCode(result.address.postcode || '');
            }
            setSearchStatus('success');
            setSearchFeedback("Location found.");
        } else {
            setSearchStatus('error');
            setSearchFeedback("Address not found. Please try a different query.");
        }
    }, [searchAddr, geocodeAddress]);

    const handleMapCapture = useCallback(async (config: MapConfig) => {
        const safeConfig = { ...config, zoom: Math.min(config.zoom, 21) };
        setDesignData(prev => ({
            ...prev,
            mapConfig: safeConfig,
            siteImageUrl: `https://mt1.google.com/vt/lyrs=s&x=${Math.floor((safeConfig.lng + 180) / 360 * Math.pow(2, safeConfig.zoom))}&y=${Math.floor((1 - Math.log(Math.tan(safeConfig.lat * Math.PI / 180) + 1 / Math.cos(safeConfig.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, safeConfig.zoom))}&z=${safeConfig.zoom}`
        }));

        setIsLoadingWeather(true);
        try {
            const weather = await fetchSolarData(config.lat, config.lng);
            setDesignData(prev => ({ ...prev, weather: weather }));
            try {
                const result = await reverseGeocode(config.lat, config.lng);
                if (result && result.displayName !== 'Current Location') {
                    setSearchAddr(result.displayName);
                    setCity(result.address.city || result.address.town || result.address.village || result.address.state || '');
                    setZipCode(result.address.postcode || '');
                }
            } catch (geocodeError) {
                console.warn('Address lookup failed (continuing anyway):', geocodeError);
            }
        } catch (e) {
            console.error("Weather fetch failed", e);
        } finally {
            setIsLoadingWeather(false);
        }
    }, [reverseGeocode, setDesignData]);

    const handleCurrentLocation = useCallback(() => {
        if (navigator.geolocation) {
            setSearchStatus('searching');
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setTargetLocation(loc);
                    setSearchStatus('success');
                    setSearchFeedback("Located via browser.");
                    const result = await reverseGeocode(loc.lat, loc.lng);
                    setSearchAddr(result.displayName);
                    setCity(result.address.city || result.address.town || result.address.village || result.address.state || '');
                    setZipCode(result.address.postcode || '');
                },
                () => {
                    setSearchStatus('error');
                    setSearchFeedback("Permission denied or unavailable.");
                }
            );
        }
    }, [reverseGeocode]);

    const clearSearch = useCallback(() => {
        setSearchAddr('');
        setTargetLocation(null);
        setSearchStatus('idle');
        setSearchFeedback("");
        setSuggestions([]);
        setShowSuggestions(false);
        if (searchInputRef.current) searchInputRef.current.value = '';
    }, []);

    const toggleSection = useCallback((section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    }, []);

    // Auto-load map location on mount
    useEffect(() => {
        const loadSavedLocation = async () => {
            if (designData.mapConfig) {
                setTargetLocation({ lat: designData.mapConfig.lat, lng: designData.mapConfig.lng });
                return;
            }
            const savedAddress = designData.projectDetails?.address || project.address;
            if (savedAddress && savedAddress !== defaultAddress) {
                try {
                    const result = await geocodeAddress(savedAddress);
                    if (result) {
                        setTargetLocation({ lat: result.lat, lng: result.lng });
                        setSearchStatus('success');
                    }
                } catch (error) {
                    console.warn('Failed to auto-load location from saved address:', error);
                }
            }
        };
        loadSavedLocation();
    }, []);

    return {
        // Search
        searchAddr, searchInputRef,
        searchStatus, searchFeedback,
        suggestions, showSuggestions, isLoadingSuggestions,
        handleSearchInputChange, handleSuggestionClick,
        handleManualSearch, handleCurrentLocation, clearSearch,
        // Location
        targetLocation, isLoadingWeather,
        handleMapCapture,
        // Form
        projectName, setProjectName,
        city, setCity, zipCode, setZipCode,
        selectedStationId, setSelectedStationId,
        openSections, toggleSection,
        customerData, setCustomerData,
        gridData, setGridData,
        notes, setNotes,
    };
}
