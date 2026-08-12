import React, { useEffect, useState, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  TextStyle,
} from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import axios from 'axios';

// Default API URL (Adjust this to your local IP or production URL)
const DEFAULT_URL = 'http://10.0.2.2:3000/api/check-pending';

type AppStatus = 'IDLE' | 'CHECKING' | 'ALERT' | 'OK' | 'ERROR';

const App = () => {
  const [apiUrl, setApiUrl] = useState(DEFAULT_URL);
  const [isServiceRunning, setIsServiceRunning] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [status, setStatus] = useState<AppStatus>('IDLE');
  const [errorCount, setErrorCount] = useState(0);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [checkInterval, setCheckInterval] = useState('60');
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Request permissions on mount
    requestPermissions();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
      }
      await notifee.requestPermission();
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const showLocalNotification = async (count: number) => {
    try {
      // Create a channel (required for Android)
      const channelId = await notifee.createChannel({
        id: 'urgent_orders',
        name: 'Urgent Orders',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibration: true,
      });

      // Display a notification
      await notifee.displayNotification({
        title: '🔔 URGENT: Orders Pending!',
        body: `${count} orders have been waiting for more than 30 seconds. Please check the dashboard!`,
        android: {
          channelId,
          smallIcon: 'ic_launcher', // Ensure this exists or use a default
          pressAction: {
            id: 'default',
          },
          importance: AndroidImportance.HIGH,
        },
      });
    } catch (error) {
      console.error('Notification failed:', error);
    }
  };

  const checkApi = async () => {
    setStatus('CHECKING');
    try {
      const response = await axios.get(apiUrl, { timeout: 10000 });
      const data = response.data;
      
      setLastCheck(new Date().toLocaleTimeString());
      
      if (data.status === 'ALERT') {
        setStatus('ALERT');
        await showLocalNotification(data.count || 0);
      } else {
        setStatus('OK');
      }
      setErrorCount(0);
    } catch (err) {
      console.error('API Check Failed:', err);
      setStatus('ERROR');
      setErrorCount(prev => prev + 1);
    }
  };

  const toggleService = () => {
    if (isServiceRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setIsServiceRunning(false);
      setStatus('IDLE');
    } else {
      setIsServiceRunning(true);
      checkApi(); // Check immediately
      const intervalMs = parseInt(checkInterval) > 0 ? parseInt(checkInterval) * 1000 : 60000;
      timerRef.current = setInterval(checkApi, intervalMs);
    }
  };

  const testNotification = () => {
    showLocalNotification(5); // Test with 5 pending orders
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Office Notifier</Text>
        <View style={[styles.statusBadge, { backgroundColor: isServiceRunning ? '#4CAF50' : '#f44336' }]}>
          <Text style={styles.statusText}>{isServiceRunning ? 'RUNNING' : 'STOPPED'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.label}>Dashboard API URL</Text>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://your-ip:3000/api/check-pending"
            placeholderTextColor="#666"
          />
          <Text style={styles.hint}>Use 10.0.2.2 for Android Emulator</Text>
        </View>

        {/* More Options Container */}
        <View style={styles.moreOptionsContainer}>
          <TouchableOpacity 
            style={styles.moreOptionsHeader} 
            onPress={() => setShowMoreOptions(!showMoreOptions)}
          >
            <Text style={styles.moreOptionsHeaderText}>
              {showMoreOptions ? 'Hide Options' : 'More Options'}
            </Text>
            <Text style={styles.moreOptionsIcon}>{showMoreOptions ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showMoreOptions && (
            <View style={styles.moreOptionsContent}>
              <View style={styles.optionRow}>
                <Text style={styles.label}>Check Interval (Seconds)</Text>
                <TextInput
                  style={styles.inputSmall}
                  value={checkInterval}
                  onChangeText={setCheckInterval}
                  keyboardType="numeric"
                  placeholder="60"
                  placeholderTextColor="#666"
                />
              </View>
              
              <TouchableOpacity 
                style={styles.testButton}
                onPress={testNotification}
              >
                <Text style={styles.testButtonText}>Test Notification</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.mainActionContainer}>
          <TouchableOpacity 
            style={[styles.bigButton, { backgroundColor: isServiceRunning ? '#f44336' : '#2196F3' }]}
            onPress={toggleService}
          >
            <Text style={styles.buttonText}>
              {isServiceRunning ? 'Stop Monitoring' : 'Start Monitoring'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Current Status</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Last Check:</Text>
            <Text style={styles.statValue}>{lastCheck || 'Never'}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>API Health:</Text>
            <View style={styles.statusIndicatorContainer}>
              {status === 'CHECKING' ? (
                <ActivityIndicator size="small" color="#2196F3" />
              ) : (
                <Text style={[styles.statValue, getStatusTextStyle(status)]}>
                  {status}
                </Text>
              )}
            </View>
          </View>

          {errorCount > 0 && (
            <Text style={styles.errorText}>
              Consecutive failures: {errorCount}
            </Text>
          )}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            • Checks the order status every 60 seconds.{"\n"}
            • Triggers a loud notification if orders are pending too long.{"\n"}
            • Keep this app running in the background for best results.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ready to Notify</Text>
      </View>
    </SafeAreaView>
  );
};

const getStatusTextStyle = (status: AppStatus): TextStyle => {
  switch (status) {
    case 'OK': return { color: '#4CAF50' };
    case 'ALERT': return { color: '#FF9800', fontWeight: 'bold' };
    case 'ERROR': return { color: '#f44336' };
    default: return { color: '#999' };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  label: {
    color: '#aaa',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#2A2A2A',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
  },
  moreOptionsContainer: {
    marginBottom: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    overflow: 'hidden',
  },
  moreOptionsHeader: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  moreOptionsHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  moreOptionsIcon: {
    color: '#aaa',
    fontSize: 14,
  },
  moreOptionsContent: {
    padding: 15,
  },
  optionRow: {
    marginBottom: 15,
  },
  inputSmall: {
    backgroundColor: '#2A2A2A',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
    marginTop: 8,
  },
  testButton: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mainActionContainer: {
    marginBottom: 20,
  },
  bigButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  statsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 16,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
  },
  statusIndicatorContainer: {
    width: 100,
    alignItems: 'flex-end',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'right',
  },
  infoBox: {
    backgroundColor: '#1a237e33',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1a237e',
  },
  infoTitle: {
    color: '#90caf9',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    color: '#bbdefb',
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    padding: 15,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
});

export default App;
