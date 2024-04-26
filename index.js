let map;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 22.2818, lng: 114.1079},
        zoom: 10
    });
    
    const originInput = document.getElementById('origin');
    const destinationInput = document.getElementById('destination');

    const autocompleteOrigin = new google.maps.places.Autocomplete(originInput);
    const autocompleteDestination = new google.maps.places.Autocomplete(destinationInput);

    autocompleteOrigin.setFields(['address_components', 'geometry']);
    autocompleteDestination.setFields(['address_components', 'geometry']);

    autocompleteOrigin.addListener('place_changed', () => {
        const place = autocompleteOrigin.getPlace();
        if (!place.geometry) {
            window.alert("No details available for input: '" + place.name + "'");
        }
    });

    autocompleteDestination.addListener('place_changed', () => {
        const place = autocompleteDestination.getPlace();
        if (!place.geometry) {
            window.alert("No details available for input: '" + place.name + "'");
        }
    });
}

function submitRouteRequest() {
    const origin = document.getElementById('origin').value;
    const destination = document.getElementById('destination').value;
    
    if (origin == '' || destination == '')
        updateStatus('Please fill in both pickup and drop-off locations.')
    else {
        updateStatus("Submitting your route request... Hang tight!");
        fetch('https://sg-mock-api.lalamove.com/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin, destination })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.token) {
                checkRouteStatus(data.token);
            }
        })
        .catch(error => {
            console.error('Error submitting route:', error);
            updateStatus(`Error: ${error.message}`, true);
            updateStatus(`An error occurred while processing your request. Please try again later or contact us for assistance. [Error code: ${error.message} - Tokenization]`, true);
        });
    }
}

function checkRouteStatus(token) {
    updateStatus("Checking the status of your route...");
    fetch(`https://sg-mock-api.lalamove.com/route/${token}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'in progress') {
                updateStatus("Your route is still being calculated. Just a moment longer...");
                setTimeout(() => checkRouteStatus(token), 2000);
            } else if (data.status === 'success') {
                displayRoute(data.path);
                updateStatus(`Route found! Covering a total distance of ${data.total_distance} meters and taking approximately ${data.total_time} seconds to complete.`);
            } else if (data.status === 'failure') {
                updateStatus(`Unfortunately, we couldn't access the location by car. Please try a different route.`, true);
            }
        })
        .catch(error => {
            console.error('Error checking route status:', error);
            updateStatus(`An error occurred while processing your request. Please try again later or contact us for assistance. [Error code: ${error.message} - Result]`, true);
        });
}

function displayRoute(path) {
    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer();
    directionsRenderer.setMap(map);

    const waypoints = path.map(p => ({
        location: { lat: parseFloat(p[0]), lng: parseFloat(p[1]) },
        stopover: true
    }));

    const routeRequest = {
        origin: waypoints.shift().location,
        destination: waypoints.pop().location,
        waypoints: waypoints,
        travelMode: 'DRIVING'
    };

    directionsService.route(routeRequest, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
        } else {
            window.alert('Directions request failed due to ' + status);
        }
    });
}

function updateStatus(message, isError = false) {
    const statusDiv = document.getElementById('status-display');
    statusDiv.textContent = message;
    if (isError) {
        statusDiv.style.color = 'red';
    } else {
        statusDiv.style.color = 'black';
    }
}
