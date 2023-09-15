/*
MIT License

Copyright (c) [2023] [@m0rniac]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import React, { useState, useEffect, useRef } from "react";
import MapView, { Marker } from "react-native-maps";
import {
  StyleSheet,
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  SafeAreaView,
} from "react-native";
import { Card, Title, Paragraph, Menu, Provider } from "react-native-paper";
import gis from "async-g-i-s";
import Swiper from "react-native-swiper";
import NetInfo from "@react-native-community/netinfo";


// Function to calculate the distance between two points
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const radlat1 = (Math.PI * lat1) / 180;
  const radlat2 = (Math.PI * lat2) / 180;
  const theta = lon1 - lon2;
  const radtheta = (Math.PI * theta) / 180;
  let dist =
    Math.sin(radlat1) * Math.sin(radlat2) +
    Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
  if (dist > 1) {
    dist = 1;
  }
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515 * 1.609344;
  return dist;
};

// Main App component
export default function App() {
  const [markerCoordinate, setMarkerCoordinate] = useState(null); // Variable to store marker coordinates
  const [countryInfo, setCountryInfo] = useState(null); // Variable to store country information
  const [isMapTypeMenuVisible, setIsMapTypeMenuVisible] = useState(false); // Variable to control map type menu visibility
  const [mapType, setMapType] = useState("standard"); // Variable to store the map type
  const [searchCountry, setSearchCountry] = useState(""); // Variable to store the user's country search input
  const [countrySuggestions, setCountrySuggestions] = useState([]); // Variable to store country search suggestions
  const [countriesData, setCountriesData] = useState([]); // Variable to store country data
  const [isInfoMinimized, setIsInfoMinimized] = useState(false); // Variable to control the country info card minimization
  const [showSuggestions, setShowSuggestions] = useState(true); // Variable to control the visibility of country search suggestions
  const [countryPhotos, setCountryPhotos] = useState([]); // Variable to store country photos
  const [isOffline, setIsOffline] = useState(false); // Variable to store offline status

  const mapViewRef = useRef(null); // Ref to MapView component

  // Fetch country data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("https://restcountries.com/v3.1/all");
        const data = await response.json();
        setCountriesData(data);
      } catch (error) {
        console.error("Error fetching country data:", error);
      }
    };

    fetchData();
  }, []);

  // Handle connectivity changes
  useEffect(() => {
    const handleConnectivityChange = (state) => {
      setIsOffline(!state.isConnected);
    };

    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle map press event
  const handleMapPress = async (event) => {
    const { coordinate } = event.nativeEvent;
    setMarkerCoordinate(coordinate);

    try {
      if (countriesData.length > 0) {
        const nearestCountry = findNearestCountry(countriesData, coordinate);
        setCountryInfo(nearestCountry);
        setShowSuggestions(false);

        const countryName = nearestCountry.name.common;
        // Limit the number of photos to 5
        const photoUrls = await gis(countryName + " country capital city pictures", {
          num: 5,
        });
        setCountryPhotos(photoUrls.map((result) => result.url));
      } else {
        setCountryInfo(null);
      }
    } catch (error) {
      console.error("Error fetching country info:", error);
    }
  };

  // Function to find the nearest country
  const findNearestCountry = (countries, coordinate) => {
    let nearestCountry = null;
    let minDistance = Number.MAX_VALUE;

    for (const country of countries) {
      if (country.latlng) {
        const [lat, lng] = country.latlng;
        const distance = calculateDistance(
          coordinate.latitude,
          coordinate.longitude,
          lat,
          lng
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearestCountry = country;
        }
      }
    }

    return nearestCountry;
  };

  // Handle map type change
  const handleMapTypeChange = (newMapType) => {
    setMapType(newMapType);
    setIsMapTypeMenuVisible(false);
  };

  // Handle country search
  const handleSearchCountry = (text) => {
    setSearchCountry(text);

    const filteredCountries = countriesData.filter((country) =>
      country.name.common.toLowerCase().includes(text.toLowerCase())
    );

    setCountrySuggestions(filteredCountries);
    setShowSuggestions(true);
    setCountryInfo(null);
  };

  // Handle country suggestion selection
  const handleCountrySuggestionSelect = async (selectedCountry) => {
    setMarkerCoordinate({
      latitude: selectedCountry.latlng[0],
      longitude: selectedCountry.latlng[1],
    });
    setCountryInfo(selectedCountry);
    setIsMapTypeMenuVisible(false);
    setCountrySuggestions([]);
    setShowSuggestions(false);

    try {
      const countryName = selectedCountry.name.common;
      // Limit the number of photos to 5
      const photoUrls = await gis(
        countryName + " country beautiful pictures",
        { num: 5 }
      );
      setCountryPhotos(photoUrls.map((result) => result.url));
    } catch (error) {
      console.error("Error fetching country photos:", error);
    }
  };

  return (
    <Provider>
      <SafeAreaView style={styles.container}>
        {isOffline && (
          <View style={styles.offlinePopup}>
            <Text style={styles.offlineText}>
              ERROR: No internet connection
            </Text>
          </View>
        )}
        <View style={styles.header}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search country"
            value={searchCountry}
            onChangeText={handleSearchCountry}
          />
          <TouchableOpacity
            style={styles.mapTypeButton}
            onPress={() => setIsMapTypeMenuVisible(true)}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>Layer</Text>
          </TouchableOpacity>
        </View>

        <MapView
          ref={mapViewRef}
          style={styles.map}
          onPress={handleMapPress}
          mapType={mapType}
        >
          {markerCoordinate && (
            <Marker coordinate={markerCoordinate} title="That's Me" />
          )}
        </MapView>
        <ScrollView style={styles.countryInfo}>
          {!isInfoMinimized && countryInfo && (
            <Card style={styles.countryCard}>
              {countryPhotos.length > 0 && (
                <Swiper
                  style={styles.countryPhotos}
                  showsButtons={false}
                  loop={false}
                  showsPagination={false}
                >
                  {countryPhotos.map((photo, index) => (
                    <View key={index} style={styles.countryImageContainer}>
                      <Image source={{ uri: photo }} style={styles.countryImage} />
                    </View>
                  ))}
                </Swiper>
              )}

              <TouchableOpacity
                onPress={() => setIsInfoMinimized(true)}
                style={styles.minimizeButton}
              >
                <Text style={styles.minimizeButtonText}>Minimize</Text>
              </TouchableOpacity>

              <View style={styles.countryDetails}>
                <View style={styles.countryHeader}>
                  <Card.Cover
                    source={{ uri: countryInfo.flags?.png }}
                    style={styles.flagImage}
                  />
                  <Title style={styles.countryName}>
                    {countryInfo.name?.common}
                  </Title>
                </View>
                <Paragraph style={styles.countryDetail}>
                  Capital: {countryInfo.capital?.[0]}
                </Paragraph>
                <Paragraph style={styles.countryDetail}>
                  Region: {countryInfo.region}
                </Paragraph>
                <Paragraph style={styles.countryDetail}>
                  Sub-Region: {countryInfo.subregion}
                </Paragraph>
                <Paragraph style={styles.countryDetail}>
                  Area: {countryInfo.area} km²
                </Paragraph>

                <Paragraph style={styles.countryDetail}>
                  Currency:{" "}
                  {Object.keys(countryInfo.currencies || {})
                    .map(
                      (currencyCode) => `${countryInfo.currencies[currencyCode].name} (${countryInfo.currencies[currencyCode].symbol})`
                    )
                    .join(", ")}
                </Paragraph>

                <Paragraph style={styles.countryDetail}>
                  Languages:{" "}
                  {Object.values(countryInfo.languages || {}).join(", ")}
                </Paragraph>

                <Paragraph style={styles.countryDetail}>
                  Population: {countryInfo.population}
                </Paragraph>
              </View>
            </Card>
          )}

          {isInfoMinimized && countryInfo && (
            <TouchableOpacity
              onPress={() => setIsInfoMinimized(false)}
              style={styles.expandButton}
            >
              <Text>Expand</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        {showSuggestions && countrySuggestions.length > 0 && (
          <ScrollView style={styles.suggestionsContainer}>
            {countrySuggestions.map((country) => (
              <TouchableOpacity
                key={country.cca2}
                onPress={() => handleCountrySuggestionSelect(country)}
              >
                <Text>{country.name.common}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <Menu
          visible={isMapTypeMenuVisible}
          onDismiss={() => setIsMapTypeMenuVisible(false)}
          anchor={{
            x: Dimensions.get("window").width - 10,
            y: 70,
          }}
        >
          <Menu.Item
            onPress={() => handleMapTypeChange("standard")}
            title="Standard"
          />
          <Menu.Item
            onPress={() => handleMapTypeChange("satellite")}
            title="Satellite"
          />
          <Menu.Item
            onPress={() => handleMapTypeChange("hybrid")}
            title="Hybrid"
          />
        </Menu>
      </SafeAreaView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    alignItems: "center",
  },
  map: {
    flex: 1,
  },
  countryInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: Dimensions.get("window").height / 2,
    width: Dimensions.get("window").width,
    backgroundColor: "white",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    padding: 10,
  },
  mapTypeButton: {
    backgroundColor: "gray",
    padding: 10,
    borderRadius: 5,
    width: 150,
  },
  searchInput: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
    width: 150,
  },
  suggestionsContainer: {
    position: "absolute",
    top: 70,
    left: 20,
    right: 20,
    backgroundColor: "white",
    borderRadius: 5,
    maxHeight: Dimensions.get("window").height / 2 - 70,
  },
  minimizeButton: {
    backgroundColor: "lightgray",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
  minimizeButtonText: {
    fontWeight: "bold",
  },
  expandButton: {
    backgroundColor: "lightgray",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  countryCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    marginBottom: 10,
  },
  flagImage: {
    width: 80,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
  },
  countryHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  countryName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  countryDetails: {
    marginVertical: 10,
  },
  countryPhotos: {
    height: 200,
    marginBottom: 10,
  },
  countryImageContainer: {
    flex: 1,
  },
  countryImage: {
    flex: 1,
  },
  countryDetail: {
    fontSize: 16,
    marginBottom: 8,
  },
  // Styles for the offline popup
  offlinePopup: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "red",
    padding: 10,
    alignItems: "center",
  },
  offlineText: {
    color: "white",
    fontWeight: "bold",
  },
});
