import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Menu, Divider, useTheme, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as hybridStorage from '../services/hybridStorage';

interface SiteSelectorProps {
    selectedSite: any | null;
    onSiteSelected: (site: any) => void;
    showManageOption?: boolean;
}

export const SiteSelector = ({ selectedSite, onSiteSelected, showManageOption = true }: SiteSelectorProps) => {
    const theme = useTheme();
    const navigation = useNavigation<any>();
    const [visible, setVisible] = useState(false);
    const [sites, setSites] = useState<any[]>([]);

    useEffect(() => {
        loadSites();
    }, []);

    const loadSites = async () => {
        const allSites = await hybridStorage.getSites();
        if (allSites) {
            setSites(allSites);
        }
    };

    const openMenu = () => setVisible(true);
    const closeMenu = () => setVisible(false);

    return (
        <View style={styles.container}>
            <Menu
                visible={visible}
                onDismiss={closeMenu}
                anchor={
                    <Button
                        mode="outlined"
                        onPress={openMenu}
                        icon="chevron-down"
                        contentStyle={{ flexDirection: 'row-reverse', justifyContent: 'space-between' }}
                        labelStyle={{ fontSize: 14, fontWeight: '500' }}
                        style={{ marginTop: 8, borderColor: theme.colors.outline, width: '100%' }}
                    >
                        {selectedSite ? selectedSite.name : "Select Site Scope..."}
                    </Button>
                }
            >
                {sites.map(site => (
                    <Menu.Item
                        key={site.id}
                        onPress={() => {
                            onSiteSelected(site);
                            closeMenu();
                        }}
                        title={site.name}
                    />
                ))}

                {showManageOption && (
                    <>
                        <Divider />
                        <Menu.Item
                            onPress={() => {
                                closeMenu();
                                navigation.navigate('SiteManagement');
                            }}
                            title="Manage Sites..."
                            leadingIcon="plus"
                        />
                    </>
                )}
            </Menu>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    }
});
