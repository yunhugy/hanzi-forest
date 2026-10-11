import { Drawer } from 'expo-router/drawer';

import { ForestDrawerContent } from '@/components/forest-drawer-content';
import { TOTAL_CHARS } from '@/features/shizi/quiz';
import { colors } from '@/theme';

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => (
        <ForestDrawerContent navigation={props.navigation as never} />
      )}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { backgroundColor: colors.bgSide, width: 272 },
        swipeEdgeWidth: 56,
        overlayColor: 'rgba(46, 51, 42, 0.35)',
      }}>
      <Drawer.Screen name="index" options={{ title: '我的小森林' }} />
      <Drawer.Screen name="shizi" options={{ title: '识字乐园' }} />
      <Drawer.Screen name="ciyu" options={{ title: '词语闯关' }} />
      <Drawer.Screen name="pinyin" options={{ title: '拼音练习' }} />
      <Drawer.Screen name="ziku" options={{ title: `${TOTAL_CHARS} 字库` }} />
      <Drawer.Screen name="cards" options={{ title: '我的汉字卡' }} />
      <Drawer.Screen name="growth" options={{ title: '成长足迹' }} />
      <Drawer.Screen name="parents" options={{ title: '给爸爸妈妈' }} />
      {/* 复习页从首页卡片进入，不占抽屉入口 */}
      <Drawer.Screen
        name="review"
        options={{ title: '今日复习', drawerItemStyle: { display: 'none' } }}
      />
    </Drawer>
  );
}
