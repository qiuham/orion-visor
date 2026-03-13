import { useEffect, useState, useMemo } from 'react';
import { Input, Radio, Empty, Tag, Tooltip, Tree, Spin } from 'antd';
import {
  DesktopOutlined,
  CodeOutlined,
  FolderOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { getHostList, type Host } from '@/api/host';
import { getHostGroupList, getGroupHosts, type HostGroup } from '@/api/hostGroup';
import { useTerminalStore } from '../store';
import type { NewConnectionType } from '../types';

const NewConnectionView: React.FC = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [groups, setGroups] = useState<HostGroup[]>([]);
  const [groupHostMap, setGroupHostMap] = useState<Record<number, number[]>>({});
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState<NewConnectionType>('list');
  const [filterValue, setFilterValue] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const { openSshSession, openSftpSession } = useTerminalStore();

  // Load host list
  useEffect(() => {
    setLoading(true);
    Promise.all([
      getHostList({ pageSize: 1000, status: 1 }),
      getHostGroupList(),
    ])
      .then(([hostRes, groupRes]) => {
        setHosts(hostRes.rows || []);
        setGroups(groupRes || []);

        // Load group-host mappings
        if (groupRes?.length) {
          const promises = groupRes.map((g: HostGroup) =>
            getGroupHosts(g.id).then((hostIds) => ({ groupId: g.id, hostIds: hostIds || [] }))
              .catch(() => ({ groupId: g.id, hostIds: [] }))
          );
          Promise.all(promises).then((results) => {
            const map: Record<number, number[]> = {};
            results.forEach((r) => {
              map[r.groupId] = r.hostIds;
            });
            setGroupHostMap(map);
          });
        }
      })
      .catch((e) => console.warn('加载主机列表失败', e))
      .finally(() => setLoading(false));
  }, []);

  // Filter hosts
  const filteredHosts = useMemo(() => {
    let list = hosts;

    // Apply group filter
    if (viewType === 'group' && selectedGroupId !== null) {
      const hostIds = groupHostMap[selectedGroupId] || [];
      list = list.filter((h) => hostIds.includes(h.id));
    }

    // Apply text filter
    if (filterValue) {
      const search = filterValue.toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(search) ||
          h.address.toLowerCase().includes(search) ||
          h.code?.toLowerCase().includes(search) ||
          h.tags?.toLowerCase().includes(search)
      );
    }

    return list;
  }, [hosts, filterValue, viewType, selectedGroupId, groupHostMap]);

  // Build tree data for groups
  const treeData = useMemo(() => {
    const buildTree = (parentId: number): any[] => {
      return groups
        .filter((g) => g.parentId === parentId)
        .sort((a, b) => a.sort - b.sort)
        .map((g) => ({
          key: g.id,
          title: `${g.name} (${(groupHostMap[g.id] || []).length})`,
          children: buildTree(g.id),
        }));
    };
    return buildTree(0);
  }, [groups, groupHostMap]);

  const handleOpenSsh = (host: Host) => {
    openSshSession(host.id, host.name, `${host.address}:${host.port}`);
  };

  const handleOpenSftp = (host: Host) => {
    openSftpSession(host.id, host.name, `${host.address}:${host.port}`);
  };

  return (
    <div className="new-connection-container">
      <div className="new-connection-wrapper">
        <h2 className="new-connection-title">新建连接</h2>

        {/* Actions bar */}
        <div className="new-connection-actions">
          <Radio.Group
            value={viewType}
            onChange={(e) => {
              setViewType(e.target.value);
              setSelectedGroupId(null);
            }}
            optionType="button"
            size="small"
          >
            <Radio.Button value="group">
              <AppstoreOutlined /> 分组
            </Radio.Button>
            <Radio.Button value="list">
              <UnorderedListOutlined /> 列表
            </Radio.Button>
          </Radio.Group>
          <Input.Search
            style={{ width: '36%' }}
            placeholder="搜索主机名称/地址/编码"
            allowClear
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          />
        </div>

        {/* Subtitle */}
        <h3 className="new-connection-subtitle">授权主机</h3>

        {/* Content */}
        <Spin spinning={loading}>
          {viewType === 'group' ? (
            <div className="host-group-tree">
              <div className="host-group-tree-sidebar">
                <Tree
                  treeData={treeData}
                  defaultExpandAll
                  selectedKeys={selectedGroupId !== null ? [selectedGroupId] : []}
                  onSelect={(keys) => {
                    setSelectedGroupId(keys.length > 0 ? (keys[0] as number) : null);
                  }}
                />
              </div>
              <div className="host-group-tree-content">
                <HostList
                  hosts={filteredHosts}
                  onOpenSsh={handleOpenSsh}
                  onOpenSftp={handleOpenSftp}
                />
              </div>
            </div>
          ) : (
            <HostList
              hosts={filteredHosts}
              onOpenSsh={handleOpenSsh}
              onOpenSftp={handleOpenSftp}
            />
          )}
        </Spin>
      </div>
    </div>
  );
};

// ============ Host List Component ============
interface HostListProps {
  hosts: Host[];
  onOpenSsh: (host: Host) => void;
  onOpenSftp: (host: Host) => void;
}

const HostList: React.FC<HostListProps> = ({ hosts, onOpenSsh, onOpenSftp }) => {
  if (hosts.length === 0) {
    return (
      <div style={{ padding: '40px 0' }}>
        <Empty
          image={<DesktopOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
          description="暂无授权主机"
        />
      </div>
    );
  }

  return (
    <div className="host-list-container">
      {hosts.map((host) => (
        <div key={host.id} className="host-list-item">
          {/* Left: icon + name */}
          <div className="host-list-item-left">
            <div className="host-list-item-icon">
              <DesktopOutlined />
            </div>
            <Tooltip title={`${host.name} (${host.code || ''})`} placement="top">
              <span className="host-list-item-name">
                {host.name} {host.code ? `(${host.code})` : ''}
              </span>
            </Tooltip>
          </div>

          {/* Center: address */}
          <div className="host-list-item-center">
            <Tooltip title={`${host.address}:${host.port}`} placement="top">
              <span className="host-list-item-address">
                {host.address}:{host.port}
              </span>
            </Tooltip>
          </div>

          {/* Right: tags + actions */}
          <div className="host-list-item-right">
            <div className="host-list-item-tags">
              {host.tags &&
                host.tags.split(',').filter(Boolean).map((tag) => (
                  <Tag key={tag} color="blue">
                    {tag}
                  </Tag>
                ))}
            </div>
            <div className="host-list-item-actions">
              <Tooltip title="SSH 终端" placement="top">
                <div className="terminal-sidebar-icon-wrapper">
                  <button
                    className="terminal-sidebar-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSsh(host);
                    }}
                  >
                    <CodeOutlined />
                  </button>
                </div>
              </Tooltip>
              <Tooltip title="SFTP 文件" placement="top">
                <div className="terminal-sidebar-icon-wrapper">
                  <button
                    className="terminal-sidebar-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenSftp(host);
                    }}
                  >
                    <FolderOutlined />
                  </button>
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NewConnectionView;
