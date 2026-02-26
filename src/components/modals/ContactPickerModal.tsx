import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, User, Phone, Mail } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { useAppTheme } from '../../theme/ThemeContext';
import Input from '../common/Input';

interface ContactPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectContact: (contact: { name: string; phone: string; email: string }) => void;
}

export default function ContactPickerModal({ visible, onClose, onSelectContact }: ContactPickerModalProps) {
    const { theme, isDark } = useAppTheme();
    const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<Contacts.Contact[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadContacts();
        }
    }, [visible]);

    const loadContacts = async () => {
        setLoading(true);
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [
                        Contacts.Fields.Name,
                        Contacts.Fields.PhoneNumbers,
                        Contacts.Fields.Emails,
                    ],
                    sort: Contacts.SortTypes.FirstName,
                });
                // Filter out contacts without names for better list quality
                const validContacts = data.filter(c => c.name && c.name.trim().length > 0);
                setContacts(validContacts);
                setFilteredContacts(validContacts);
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredContacts(contacts);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = contacts.filter(contact => {
                const nameMatch = contact.name?.toLowerCase().includes(query);
                const phoneMatch = contact.phoneNumbers?.some(p => p.number?.replace(/[^0-9]/g, '').includes(query.replace(/[^0-9]/g, '')));
                return nameMatch || phoneMatch;
            });
            setFilteredContacts(filtered);
        }
    }, [searchQuery, contacts]);

    const handleSelect = (contact: Contacts.Contact) => {
        const name = contact.name || '';
        // Clean up phone number (remove spaces, dashes etc standard cleanup if needed, but here we just take the first)
        const phone = contact.phoneNumbers?.[0]?.number || '';
        const email = contact.emails?.[0]?.email || '';
        onSelectContact({ name, phone, email });
        setSearchQuery('');
        onClose();
    };

    const renderContactItem = ({ item }: { item: Contacts.Contact }) => (
        <Pressable
            style={styles.contactItem}
            onPress={() => handleSelect(item)}
        >
            <View style={[styles.avatarContainer, { backgroundColor: isDark ? theme.colors.surface : theme.colors.accentLight }]}>
                <User size={20} color={theme.colors.accent} />
            </View>
            <View style={styles.contactDetails}>
                <Text style={styles.contactName}>{item.name}</Text>
                {item.phoneNumbers?.[0] && (
                    <View style={styles.infoRow}>
                        <Phone size={12} color={theme.colors.textTertiary} style={styles.infoIcon} />
                        <Text style={styles.contactInfo}>{item.phoneNumbers[0].number}</Text>
                    </View>
                )}
                {item.emails?.[0] && !item.phoneNumbers?.[0] && (
                    <View style={styles.infoRow}>
                        <Mail size={12} color={theme.colors.textTertiary} style={styles.infoIcon} />
                        <Text style={styles.contactInfo}>{item.emails[0].email}</Text>
                    </View>
                )}
            </View>
        </Pressable>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={onClose}
        >
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
                    <View>
                        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Import Contact</Text>
                        <Text style={[styles.headerSubtitle, { color: theme.colors.textTertiary }]}>
                            {contacts.length} Contacts found
                        </Text>
                    </View>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <X size={24} color={theme.colors.textPrimary} />
                    </Pressable>
                </View>

                <View style={styles.searchContainer}>
                    <Input
                        placeholder="Search by name or number..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        icon={<Search size={20} color={theme.colors.textTertiary} />}
                        style={styles.searchInput}
                    />
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={theme.colors.accent} />
                        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Fetching contacts...</Text>
                    </View>
                ) : filteredContacts.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surface }]}>
                            <User size={48} color={theme.colors.border} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No contacts found</Text>
                        <Text style={[styles.emptySubtitle, { color: theme.colors.textTertiary }]}>
                            Try searching for something else
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredContacts}
                        keyExtractor={(item, index) => (item as any).id || index.toString()}
                        renderItem={renderContactItem}
                        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />}
                        contentContainerStyle={styles.listContent}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 12,
        marginTop: 2,
    },
    closeBtn: {
        padding: 8,
    },
    searchContainer: {
        padding: 20,
        paddingBottom: 10,
    },
    searchInput: {
        marginBottom: 0,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    contactDetails: {
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    infoIcon: {
        marginRight: 6,
    },
    contactInfo: {
        fontSize: 14,
    },
    separator: {
        height: 1,
        width: '100%',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 14,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
});
