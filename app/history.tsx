import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DailyStats,
  DailyStatsByDate,
  getAllDailyStats,
  getTotalStats,
} from '@/storage/sessionStore';

type DateObject = {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
};

type MarkedDate = {
  customStyles: {
    container: object;
    text: object;
  };
};

type MarkedDates = Record<string, MarkedDate>;

export default function HistoryScreen() {
  const router = useRouter();
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [statsByDate, setStatsByDate] = useState<DailyStatsByDate>({});
  const [totalStats, setTotalStatsState] = useState<DailyStats>({ 
    completed: 0, 
    interrupted: 0, 
    sessions: [] 
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const allStats = await getAllDailyStats();
      const totals = await getTotalStats();
      setStatsByDate(allStats);
      setMarkedDates(buildMarkedDates(allStats));
      setTotalStatsState(totals);
      setLoading(false);
    };

    load();
  }, []);

  const handleDayPress = (day: DateObject) => {
    setSelectedDate(day.dateString);
    setShowModal(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              router.push('/');
            }}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.8 }]}>
            <Text style={styles.backButtonText}>Geri dön</Text>
          </Pressable>
          <Text style={styles.title}>İlerlemem</Text>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator color="#6ee7b7" />
          </View>
        ) : (
          <>
            <Calendar
              theme={{
                backgroundColor: 'transparent',
                calendarBackground: 'transparent',
                monthTextColor: '#e5e7eb',
                dayTextColor: '#9ca3af',
                todayTextColor: '#22c55e',
                arrowColor: '#9ca3af',
              }}
              style={styles.calendar}
              markingType="custom"
              markedDates={markedDates}
              onDayPress={handleDayPress}
            />

            <View style={styles.legendContainer}>
              <Text style={styles.legendTitle}>Renkler</Text>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, styles.legendCompleted]} />
                <Text style={styles.legendText}>Tamamlanan nefes seansları</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, styles.legendInterrupted]} />
                <Text style={styles.legendText}>Yarım kalmış seanslar</Text>
              </View>
            </View>

            <View style={styles.totalContainer}>
              <Text style={styles.sectionTitle}>Genel İstatistikler</Text>
              <Text style={styles.totalText}>
                Bugüne kadar toplam{' '}
                <Text style={styles.totalStrong}>{totalStats.completed}</Text> kez nefes seansını
                tamamladın.
              </Text>
              <Text style={styles.totalText}>
                Ve{' '}
                <Text style={styles.totalStrong}>{totalStats.interrupted}</Text> kez de yarıda
                bırakmış olabilirsin; bu da sürecin doğal bir parçası.
              </Text>
            </View>

            <Modal
              visible={!!selectedDate && showModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowModal(false)}>
              <View style={styles.modalBackdrop}>
                <View style={styles.modalContainer}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {selectedDate ? formatDateTurkish(selectedDate) : ''}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setShowModal(false);
                      }}
                      style={({ pressed }) => [
                        styles.modalCloseButton,
                        pressed && { opacity: 0.7 },
                      ]}>
                      <Text style={styles.modalCloseText}>Kapat</Text>
                    </Pressable>
                  </View>
                  {renderModalContent(selectedDate, statsByDate)}
                </View>
              </View>
            </Modal>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function renderModalContent(
  selectedDate: string | null,
  statsByDate: DailyStatsByDate,
): React.ReactNode {
  if (!selectedDate) {
    return (
      <Text style={styles.modalBodyText}>
        Bir güne dokunduğunda, o güne ait kaydı burada göreceksin.
      </Text>
    );
  }

  const dayStats = statsByDate[selectedDate];

  if (!dayStats || (dayStats.completed === 0 && dayStats.interrupted === 0)) {
    return <Text style={styles.modalBodyText}>Bugüne ait bir kayıt yok.</Text>;
  }

  const summaryParts: string[] = [];
  if (dayStats.completed > 0) summaryParts.push(`${dayStats.completed} başarılı`);
  if (dayStats.interrupted > 0) summaryParts.push(`${dayStats.interrupted} yarım`);

  return (
    <View style={styles.modalBody}>
      <Text style={styles.modalSummaryText}>{summaryParts.join(', ')} seans.</Text>
      {dayStats.sessions?.length ? (
        <View style={styles.timeline}>
          {[...dayStats.sessions].reverse().map((session, index) => (
            <View key={`${selectedDate}-${index}`} style={styles.timelineRow}>
              <View
                style={[
                  styles.timelineDot,
                  session.status === 'completed'
                    ? styles.timelineDotCompleted
                    : styles.timelineDotInterrupted,
                ]}
              />
              <Text style={styles.timelineTime}>{session.time}</Text>
              <Text style={styles.timelineLabel}>
                {session.status === 'completed'
                  ? 'Başarıyla tamamlandı.'
                  : 'Yarım bırakıldı.'}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.modalBodyText}>Bu güne ait ayrıntılı seans kaydı yok.</Text>
      )}
    </View>
  );
}

function buildMarkedDates(stats: DailyStatsByDate): MarkedDates {
  const result: MarkedDates = {};

  Object.entries(stats).forEach(([date, value]) => {
    const { completed, interrupted } = value;
    if (completed === 0 && interrupted === 0) {
      return;
    }

    let borderColor = 'transparent';
    let textColor = '#9ca3af';

    if (completed > 0) {
      borderColor = 'rgba(34,197,94,0.9)';
      textColor = '#e5e7eb';
    } else if (interrupted > 0) {
      borderColor = 'rgba(148,163,184,0.5)';
      textColor = '#9ca3af';
    }

    result[date] = {
      customStyles: {
        container: {
          backgroundColor: 'transparent',
          borderRadius: 10,
          borderWidth: 1,
          borderColor,
        },
        text: {
          color: textColor,
          fontWeight: completed > 0 ? '600' : '400',
        },
      },
    };
  });

  return result;
}

function formatDateTurkish(dateString: string): string {
  const [, month, day] = dateString.split('-').map(Number);
  const months = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ];
  const monthName = months[(month ?? 1) - 1] ?? '';
  return `${day} ${monthName}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backButtonText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  calendar: {
    borderRadius: 12,
    paddingVertical: 8,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  dailyContainer: {
    marginTop: 4,
  },
  dailyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  legendContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f2937',
    gap: 8,
  },
  legendTitle: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  legendCompleted: {
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.9)',
  },
  legendInterrupted: {
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
  },
  legendText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  totalContainer: {
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#1f2937',
    gap: 6,
  },
  totalText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  totalStrong: {
    color: '#bbf7d0',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#020617',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1f2937',
    padding: 16,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  modalCloseButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  modalCloseText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalBody: {
    marginTop: 4,
    gap: 8,
  },
  modalBodyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalSummaryText: {
    fontSize: 14,
    color: '#e5e7eb',
    fontWeight: '500',
  },
  timeline: {
    marginTop: 8,
    gap: 6,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  timelineDotCompleted: {
    backgroundColor: '#22c55e',
  },
  timelineDotInterrupted: {
    backgroundColor: '#9ca3af',
  },
  timelineTime: {
    fontSize: 13,
    color: '#e5e7eb',
    width: 54,
  },
  timelineLabel: {
    fontSize: 13,
    color: '#9ca3af',
    flexShrink: 1,
  },
});

