import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, Clipboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, useTheme, FAB, IconButton, Searchbar, Dialog, Portal, Button, TextInput, Menu, SegmentedButtons, HelperText } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { usersApi, authApi } from '../services/api';
import { Colors } from '../constants/design';

export default function UserManagementScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        role: 'surveyor',
        organization: '',
        password: '',
    });
    const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);

    // Password rules (mirrors backend password.service.ts)
    const validatePw = (pw: string): string[] => {
        const errs: string[] = [];
        if (pw.length < 8) errs.push('At least 8 characters');
        if (!/[A-Z]/.test(pw)) errs.push('One uppercase letter');
        if (!/[a-z]/.test(pw)) errs.push('One lowercase letter');
        if (!/\d/.test(pw)) errs.push('One number');
        return errs;
    };

    const generatePassword = () => {
        const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lower = 'abcdefghijklmnopqrstuvwxyz';
        const nums = '0123456789';
        const all = upper + lower + nums + '!@#$%';
        let pw = upper[Math.floor(Math.random() * upper.length)]
            + lower[Math.floor(Math.random() * lower.length)]
            + nums[Math.floor(Math.random() * nums.length)];
        for (let i = pw.length; i < 12; i++) pw += all[Math.floor(Math.random() * all.length)];
        pw = pw.split('').sort(() => Math.random() - 0.5).join('');
        setFormData(prev => ({ ...prev, password: pw }));
        setPasswordErrors([]);
        Clipboard.setString(pw);
        Alert.alert('Password Generated', `Password: ${pw}\n\nCopied to clipboard!`);
    };

    // Audit Logs State
    const [auditLogVisible, setAuditLogVisible] = useState(false);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditLogLoading, setAuditLogLoading] = useState(false);
    const [selectedUserForLogs, setSelectedUserForLogs] = useState<any>(null);

    // Menu State
    const [menuVisible, setMenuVisible] = useState<{ [key: string]: boolean }>({});

    const toggleMenu = (userId: string, visible: boolean) => {
        setMenuVisible(prev => ({ ...prev, [userId]: visible }));
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadUsers();
        });
        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        filterUsers();
    }, [users, searchQuery]);

    const loadUsers = async () => {
        try {
            const allUsers = await usersApi.getAll();
            setUsers(allUsers);
        } catch (error) {
            console.error('Failed to load users:', error);
            // Fallback to empty or show error
        }
    };

    const filterUsers = () => {
        if (searchQuery) {
            setFilteredUsers(
                users.filter(u =>
                    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredUsers(users);
        }
    };

    const handleAddUser = () => {
        setEditingUser(null);
        setFormData({ email: '', fullName: '', role: 'surveyor', organization: '', password: '' });
        setPasswordErrors([]);
        setShowPassword(false);
        setDialogVisible(true);
    };

    const handleEditUser = (user: any) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            organization: user.organization || '',
            password: '',
        });
        setDialogVisible(true);
    };

    const handleSaveUser = async () => {
        try {
            if (!formData.fullName.trim() || !formData.email.trim()) {
                Alert.alert('Validation Error', 'Full name and email are required.');
                return;
            }
            if (!editingUser) {
                if (!formData.password.trim()) {
                    Alert.alert('Validation Error', 'Password is required. Use the Generate button or enter one manually.');
                    return;
                }
                const errs = validatePw(formData.password);
                if (errs.length > 0) {
                    setPasswordErrors(errs);
                    return; // Show inline errors, don't call API
                }
            }
            if (editingUser) {
                // Update existing user
                await usersApi.update(editingUser.id, {
                    fullName: formData.fullName,
                    role: formData.role,
                    organization: formData.role === 'reviewer' ? (formData.organization || undefined) : undefined,
                    email: formData.email,
                    ...(formData.password ? { password: formData.password } : {})
                });
            } else {
                // Create new user
                await authApi.register({
                    email: formData.email,
                    password: formData.password,
                    fullName: formData.fullName,
                    role: formData.role,
                    ...(formData.role === 'reviewer' && formData.organization ? { organization: formData.organization } : {})
                });
                Alert.alert('User Created', `Account created for ${formData.email}.\n\nPlease share the password securely with the user.`);
            }
            setDialogVisible(false);
            loadUsers();
        } catch (error: any) {
            console.error('Failed to save user:', error);
            // Surface the real backend error message (e.g. password requirements)
            const serverMsg = error?.response?.data?.details?.join('\n') ||
                error?.response?.data?.error ||
                'Failed to save user. Please try again.';
            Alert.alert('Error', serverMsg);
        }
    };

    const handleDeleteUser = (userId: string) => {
        // Prevent admin from deleting their own account
        if (userId === currentUser?.id) {
            Alert.alert('Cannot Delete', 'You cannot delete your own account. Contact another admin if needed.');
            return;
        }
        Alert.alert(
            'Delete User',
            'Are you sure you want to delete this user?\n\nWARNING: This will remove their login access and anonymize their contributions (Sites, Surveys, Logs). This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await usersApi.delete(userId);
                            loadUsers();
                        } catch (error) {
                            console.error('Failed to delete user:', error);
                            alert('Failed to delete user.');
                        }
                    }
                }
            ]
        );
    };
    const handleActivateUser = async (userId: string) => {
        try {
            await usersApi.activate(userId);
            loadUsers();
            toggleMenu(userId, false);
        } catch (error) {
            console.error('Failed to activate user:', error);
            alert('Failed to activate user.');
        }
    };

    const handleDeactivateUser = async (userId: string) => {
        try {
            await usersApi.deactivate(userId);
            loadUsers();
            toggleMenu(userId, false);
        } catch (error) {
            console.error('Failed to deactivate user:', error);
            alert('Failed to deactivate user.');
        }
    };

    const handleViewAuditLogs = async (user: any) => {
        setSelectedUserForLogs(user);
        setAuditLogVisible(true);
        setAuditLogLoading(true);
        toggleMenu(user.id, false);
        try {
            const logs = await usersApi.getAuditLogs(user.id);
            setAuditLogs(logs);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
            alert('Failed to load audit logs.');
        } finally {
            setAuditLogLoading(false);
        }
    };

    const RoleBadge = ({ role }: { role: string }) => {
        const r = role.toLowerCase();
        let color: string;
        let bg: string;
        if (r === 'admin') {
            color = theme.colors.primary;
            bg = theme.colors.primaryContainer;
        } else if (r === 'reviewer') {
            color = theme.colors.secondary;
            bg = theme.colors.secondaryContainer;
        } else {
            // surveyor
            color = theme.colors.tertiary;
            bg = theme.colors.tertiaryContainer;
        }

        return (
            <View style={{ backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: color + '30' }}>
                <Text style={{ color, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                    {role.toUpperCase()}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <Surface style={styles.screenHeader} elevation={1}>
                    <IconButton
                        icon="arrow-left"
                        size={24}
                        onPress={() => navigation.goBack()}
                        iconColor={theme.colors.primary}
                    />
                    <Text style={[styles.title, { color: theme.colors.primary }]}>
                        Users
                    </Text>
                </Surface>
                <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, marginLeft: 4 }]}>
                    {filteredUsers.length} users
                </Text>
            </View>

            {/* Search */}
            <Searchbar
                placeholder="Search users..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={[styles.searchBar, { backgroundColor: theme.colors.surface }]}
                iconColor={theme.colors.primary}
                elevation={1}
            />

            {/* User List */}
            <FlatList
                style={{ flex: 1 }}
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]} elevation={1}>
                        <View style={styles.cardContent}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
                                    {item.full_name}
                                </Text>
                                <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
                                    {item.email}
                                </Text>
                                <Text style={[styles.lastLogin, { color: theme.colors.onSurfaceVariant }]}>
                                    Last login: {item.last_login ? new Date(item.last_login).toLocaleDateString() : 'Never'}
                                </Text>
                                {item.role === 'reviewer' && item.organization && (
                                    <Text style={[styles.lastLogin, { color: theme.colors.secondary, fontWeight: '600' }]}>
                                        Org: {item.organization}
                                    </Text>
                                )}
                            </View>
                            <RoleBadge role={item.role} />
                            <Menu
                                visible={menuVisible[item.id]}
                                onDismiss={() => toggleMenu(item.id, false)}
                                anchor={
                                    <View>
                                        <IconButton
                                            icon="dots-vertical"
                                            onPress={() => toggleMenu(item.id, true)}
                                        />
                                    </View>
                                }
                            >
                                <Menu.Item onPress={() => { toggleMenu(item.id, false); handleEditUser(item); }} title="Edit" leadingIcon="pencil" />
                                <Menu.Item onPress={() => { item.is_active ? handleDeactivateUser(item.id) : handleActivateUser(item.id) }} title={item.is_active ? "Deactivate" : "Activate"} leadingIcon={item.is_active ? "block-helper" : "check-circle"} />
                                <Menu.Item onPress={() => handleViewAuditLogs(item)} title="Audit Logs" leadingIcon="history" />
                                <Menu.Item onPress={() => { toggleMenu(item.id, false); handleDeleteUser(item.id); }} title="Delete" leadingIcon="delete" titleStyle={{ color: theme.colors.error }} />
                            </Menu>
                        </View>
                    </Surface>
                )}
            />

            {/* Add User FAB */}
            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                onPress={handleAddUser}
            />

            {/* Add/Edit User Dialog */}
            <Portal>
                <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={{ backgroundColor: theme.colors.surface, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
                    <Dialog.Title>{editingUser ? 'Edit User' : 'Add User'}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Full Name"
                            value={formData.fullName}
                            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                            mode="outlined"
                            style={styles.input}
                            theme={{ colors: { primary: theme.colors.primary, onSurface: '#1C1917', onSurfaceVariant: '#57534E', placeholder: '#57534E', background: '#FFFFFF' } }}
                        />
                        <TextInput
                            label="Email"
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            mode="outlined"
                            keyboardType="email-address"
                            style={styles.input}
                            theme={{ colors: { primary: theme.colors.primary, onSurface: '#1C1917', onSurfaceVariant: '#57534E', placeholder: '#57534E', background: '#FFFFFF' } }}
                        />
                        {/* Password row: input + generate button */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <TextInput
                                label={editingUser ? 'New Password (optional)' : 'Password *'}
                                value={formData.password}
                                onChangeText={(text) => {
                                    setFormData({ ...formData, password: text });
                                    if (!editingUser) setPasswordErrors(text ? validatePw(text) : []);
                                }}
                                mode="outlined"
                                secureTextEntry={!showPassword}
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                placeholder={editingUser ? 'Leave blank to keep current' : ''}
                                error={passwordErrors.length > 0}
                                right={
                                    <TextInput.Icon
                                        icon={showPassword ? 'eye-off' : 'eye'}
                                        onPress={() => setShowPassword(v => !v)}
                                    />
                                }
                                theme={{ colors: { primary: theme.colors.primary, onSurface: '#1C1917', onSurfaceVariant: '#57534E', placeholder: '#57534E', background: '#FFFFFF' } }}
                            />
                            {!editingUser && (
                                <Button
                                    mode="outlined"
                                    onPress={generatePassword}
                                    style={{ marginTop: 6 }}
                                    compact
                                >
                                    Generate
                                </Button>
                            )}
                        </View>
                        {/* Inline password validation errors */}
                        {!editingUser && passwordErrors.length > 0 && (
                            <View style={{ marginTop: 4, marginBottom: 4, paddingHorizontal: 4 }}>
                                {passwordErrors.map((err, i) => (
                                    <Text key={i} style={{ fontSize: 12, color: theme.colors.error }}>
                                        ✗ {err}
                                    </Text>
                                ))}
                            </View>
                        )}
                        {!editingUser && formData.password.length > 0 && passwordErrors.length === 0 && (
                            <Text style={{ fontSize: 12, color: Colors.status.successGreen, marginTop: 4 }}>Password meets all requirements</Text>
                        )}
                        <Text style={{ marginTop: 12, marginBottom: 8, fontWeight: 'bold' }}>Role</Text>
                        <SegmentedButtons
                            value={formData.role}
                            onValueChange={(value) => setFormData({ ...formData, role: value, organization: value !== 'reviewer' ? '' : formData.organization })}
                            buttons={[
                                { value: 'surveyor', label: 'Surveyor' },
                                { value: 'admin', label: 'Admin' },
                                { value: 'reviewer', label: 'Reviewer' },
                            ]}
                            style={{ marginBottom: 16 }}
                        />
                        {formData.role === 'reviewer' && (
                            <>
                                <Text style={{ marginBottom: 8, fontWeight: 'bold' }}>Organisation</Text>
                                <SegmentedButtons
                                    value={formData.organization}
                                    onValueChange={(value) => setFormData({ ...formData, organization: value })}
                                    buttons={[
                                        { value: 'MAG', label: 'MAG' },
                                        { value: 'CIT', label: 'CIT' },
                                        { value: 'DGDA', label: 'DGDA' },
                                    ]}
                                    style={{ marginBottom: 16 }}
                                />
                            </>
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
                        <Button onPress={handleSaveUser}>Save</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Audit Log Modal */}
            <Portal>
                <Dialog visible={auditLogVisible} onDismiss={() => setAuditLogVisible(false)} style={{ maxHeight: '80%', backgroundColor: theme.colors.surface }}>
                    <Dialog.Title>Audit Logs: {selectedUserForLogs?.full_name}</Dialog.Title>
                    <Dialog.Content>
                        {auditLogLoading ? (
                            <Text style={{ textAlign: 'center', padding: 20 }}>Loading logs...</Text>
                        ) : (
                            <FlatList
                                data={auditLogs}
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={({ item }) => (
                                    <View style={{ marginBottom: 12, borderBottomWidth: 0.5, borderBottomColor: Colors.neutral[200], paddingBottom: 8 }}>
                                        <Text style={{ fontWeight: 'bold' }}>{item.action}</Text>
                                        <Text style={{ fontSize: 12, color: 'gray' }}>{new Date(item.timestamp).toLocaleString()}</Text>
                                        {item.details && (
                                            <Text style={{ fontSize: 12, marginTop: 4 }}>{JSON.stringify(item.details)}</Text>
                                        )}
                                    </View>
                                )}
                                ListEmptyComponent={<Text style={{ textAlign: 'center', padding: 20 }}>No logs found.</Text>}
                            />
                        )}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setAuditLogVisible(false)}>Close</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 20,
        paddingBottom: 10,
    },
    screenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 16,
        marginBottom: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '700',
        opacity: 0.6,
    },
    searchBar: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 14,
        height: 48,
    },
    listContent: {
        padding: 20,
        paddingTop: 0,
        paddingBottom: 100,
    },
    card: {
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.neutral[200],
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    userName: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    userEmail: {
        fontSize: 14,
        marginBottom: 4,
        opacity: 0.7,
    },
    lastLogin: {
        fontSize: 12,
        opacity: 0.5,
    },
    actions: {
        flexDirection: 'row',
        marginLeft: 8,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        borderRadius: 16,
    },
    input: {
        marginBottom: 16,
    },
});
