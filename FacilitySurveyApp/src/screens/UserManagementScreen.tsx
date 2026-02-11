import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Surface, useTheme, FAB, IconButton, Searchbar, Dialog, Portal, Button, TextInput, Menu } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { usersApi, authApi } from '../services/api';

export default function UserManagementScreen() {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const [users, setUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        role: 'surveyor',
        password: '',
    });

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
                    u.fullName.toLowerCase().includes(searchQuery.toLowerCase())
                )
            );
        } else {
            setFilteredUsers(users);
        }
    };

    const handleAddUser = () => {
        setEditingUser(null);
        setFormData({ email: '', fullName: '', role: 'surveyor', password: '' });
        setDialogVisible(true);
    };

    const handleEditUser = (user: any) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            password: '',
        });
        setDialogVisible(true);
    };

    const handleSaveUser = async () => {
        try {
            if (editingUser) {
                // Update existing user
                await usersApi.update(editingUser.id, {
                    fullName: formData.fullName,
                    role: formData.role,
                    email: formData.email, // If backend supports email update
                    ...(formData.password ? { password: formData.password } : {})
                });
            } else {
                // Create new user (Register)
                await authApi.register({
                    email: formData.email,
                    password: formData.password || 'password123', // Default pwd if needed
                    fullName: formData.fullName,
                    role: formData.role
                });
            }
            setDialogVisible(false);
            loadUsers();
        } catch (error) {
            console.error('Failed to save user:', error);
            alert('Failed to save user. Please try again.');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            await usersApi.delete(userId);
            loadUsers();
        } catch (error) {
            console.error('Failed to delete user:', error);
            alert('Failed to delete user.');
        }
    };

    const RoleBadge = ({ role }: { role: string }) => {
        const colors: any = {
            admin: { bg: '#fef3c7', text: '#f59e0b' },
            surveyor: { bg: '#dbeafe', text: '#3b82f6' },
            reviewer: { bg: '#dcfce7', text: '#22c55e' },
        };
        const color = colors[role] || colors.surveyor;

        return (
            <View style={{ backgroundColor: color.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: color.text, fontSize: 11, fontWeight: '700' }}>
                    {role.toUpperCase()}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <IconButton
                        icon="arrow-left"
                        size={24}
                        onPress={() => navigation.goBack()}
                        style={{ marginLeft: -8 }}
                    />
                    <Text style={[styles.title, { color: theme.colors.onBackground }]}>
                        User Management
                    </Text>
                </View>
                <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, marginLeft: 4 }]}>
                    {filteredUsers.length} users
                </Text>
            </View>

            {/* Search */}
            <Searchbar
                placeholder="Search users..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
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
                                    {item.fullName}
                                </Text>
                                <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
                                    {item.email}
                                </Text>
                                <Text style={[styles.lastLogin, { color: theme.colors.onSurfaceVariant }]}>
                                    Last login: {new Date(item.lastLogin).toLocaleDateString()}
                                </Text>
                            </View>
                            <RoleBadge role={item.role} />
                            <View style={styles.actions}>
                                <IconButton
                                    icon="pencil"
                                    size={20}
                                    iconColor={theme.colors.primary}
                                    onPress={() => handleEditUser(item)}
                                />
                                <IconButton
                                    icon="delete"
                                    size={20}
                                    iconColor={theme.colors.error}
                                    onPress={() => handleDeleteUser(item.id)}
                                />
                            </View>
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
                <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
                    <Dialog.Title>{editingUser ? 'Edit User' : 'Add User'}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="Full Name"
                            value={formData.fullName}
                            onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                            mode="outlined"
                            style={styles.input}
                        />
                        <TextInput
                            label="Email"
                            value={formData.email}
                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                            mode="outlined"
                            keyboardType="email-address"
                            style={styles.input}
                        />
                        <TextInput
                            label="Password"
                            value={formData.password}
                            onChangeText={(text) => setFormData({ ...formData, password: text })}
                            mode="outlined"
                            secureTextEntry
                            style={styles.input}
                            placeholder={editingUser ? 'Leave blank to keep current' : ''}
                        />
                        {/* Role selector would go here */}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
                        <Button onPress={handleSaveUser}>Save</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    searchBar: {
        marginBottom: 16,
        borderRadius: 12,
    },
    listContent: {
        paddingBottom: 100,
    },
    card: {
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 14,
        marginBottom: 2,
    },
    lastLogin: {
        fontSize: 12,
    },
    actions: {
        flexDirection: 'row',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
    },
    input: {
        marginBottom: 12,
    },
});
