/**
 * Location Service
 * Handles interactions with Geoapify API via backend proxy
 */

/**
 * Search for locations using backend proxy API (Geoapify Search API)
 * @param {string} text - The search text
 * @returns {Promise<Array<{formatted: string, city: string, state: string, country: string, postcode: string}>>}
 */
export async function searchLocations(text) {
    if (!text || text.trim().length < 2) {
        return [];
    }

    try {
        const params = new URLSearchParams({
            text: text
        });

        // Call our local backend proxy instead of direct Geoapify URL
        const response = await fetch(`/api/location/search?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Location API request failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('[LocationService] API Response:', data);

        // Geoapify Search API returns 'results' array (not features)
        if (!data.results || !Array.isArray(data.results)) {
            console.warn('[LocationService] No results array found');
            return [];
        }

        return data.results.map(props => {
            // Prioritize city, state display if available
            let display = props.formatted;
            if (props.city && props.state_code) {
                display = `${props.city}, ${props.state_code}`;
                if (props.postcode) {
                    display += ` ${props.postcode}`;
                }
            } else if (props.city && props.state) {
                display = `${props.city}, ${props.state}`;
                if (props.postcode) {
                    display += ` ${props.postcode}`;
                }
            }

            return {
                formatted: display, // This is what we'll show in the list
                original: props,   // Keep original data just in case
                city: props.city,
                state: props.state || props.state_code,
                country: props.country,
                county: props.county,
                postcode: props.postcode
            };
        });

    } catch (error) {
        console.error('Error searching locations:', error);
        return [];
    }
}

/**
 * Update the zip code for a specific magnet
 * @param {string} id - The magnet ID
 * @param {string|object} locationData - The new zip code or location object
 * @returns {Promise<boolean>} - True if successful
 */
export async function updateMagnetZip(id, locationData) {
    if (!id || !locationData) return false;

    // Handle both string (legacy) and object inputs
    const zipCode = typeof locationData === 'string' ? locationData : locationData.postcode;
    const city = typeof locationData === 'object' ? locationData.city : null;
    const state = typeof locationData === 'object' ? locationData.state : null;
    const country = typeof locationData === 'object' ? locationData.country : null;

    if (!zipCode) return false;

    try {
        const response = await fetch(`/api/magnets/${id}/zip-code`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                zipCode,
                city,
                state,
                country
            })
        });

        if (!response.ok) {
            console.error('Failed to update zip code:', response.status);
            return false;
        }

        const data = await response.json();
        return data.success === true;
    } catch (error) {
        console.error('Error updating zip code:', error);
        return false;
    }
}
