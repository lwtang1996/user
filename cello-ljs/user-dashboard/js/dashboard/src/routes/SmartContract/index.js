/*
 SPDX-License-Identifier: Apache-2.0
*/
import React, { PureComponent } from 'react'
import { connect } from 'dva'
import { Link } from 'dva/router'
import {
  Upload, Card, Button, Icon, List, Badge, Modal,
  message, Menu, Dropdown, Avatar, Tooltip,TreeSelect
} from 'antd'
import Ellipsis from '../../components/Ellipsis'

const Cookies = require('js-cookie')

import { injectIntl, intlShape, FormattedMessage } from 'react-intl'
import messages from './messages'
import { EditModal, InstallModal, InstantiateModal } from './components'
import moment from 'moment'

import PageHeaderLayout from '../../layouts/PageHeaderLayout'

import styles from './index.less'

const confirm = Modal.confirm

@connect(state => ({
  chain: state.chain,
  subchain: state.subChain,
  chainCode: state.chainCode,
}))
class SmartContract extends PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      fileList: [],
      uploading: false,
      value: [],
    }
  }
  componentDidMount () {
    this.props.dispatch({
      type: 'chainCode/listChainCodes',
    })
    this.props.dispatch({
      type: 'chain/listDBChain',
    })
    this.props.dispatch({
      type: 'subChain/listDBChain',
    })
  }

  componentWillUnmount () {
  }
  codeStatus (status) {
    switch (status) {
      case 'installed':
        return 'warning'
      case 'instantiated':
        return 'success'
      case 'error':
        return 'error'
      case 'instantiating':
        return 'processing'
      case 'uploaded':
        return 'default'
    }
  }

  clickMenu = ({ item, key, keyPath }) => {
    const { dispatch, intl } = this.props
    const { chainCode: { chainCodes } } = this.props
    const codeId = item.props.codeId
    const currentChainCode = chainCodes.filter(item => item.id === codeId)[0]
    switch (key) {
      case 'delete':
        confirm({
          title: intl.formatMessage(messages.confirm.deleteChainCode, { name: item.props.name }),
          onOk () {
            dispatch({
              type: 'chainCode/deleteChainCode',
              payload: {
                id: item.props.codeId,
                name: item.props.name,
              },
            })
          },
          onCancel () {
            console.log('Cancel')
          },
        })
        break
      case 'install':
        dispatch({
          type: 'chainCode/showInstallModal',
          payload: {
            currentChainCode,
          },
        })
        break
      case 'instantiate':
        dispatch({
          type: 'chainCode/showInstantiateModal',
          payload: {
            currentChainCode,
          },
        })
        break
    }
  }

  onClickEdit = (item) => {
    const { dispatch } = this.props
    dispatch({
      type: 'chainCode/showEditModal',
      payload: {
        currentChainCode: item,
      },
    })
  }

  onSelectChange = (value) => {
    this.setState({ value });
  }

  render () {
    const { fileList } = this.state
    const _that = this
    const {
      chain: { currentChainId, dbChains , peerTree},
      subchain: { dbChains: subdbChains },
      chainCode: {
        chainCodes, loadingChainCodes, editing, installModalVisible,
        instantiateModalVisible, editModalVisible, currentChainCode, installing,
      },
      intl, dispatch,
    } = this.props
    const token = Cookies.get('CelloToken')
    const uploadProps = {
      action: '/api/chain-code/upload',
      name: 'code',
      headers: {
        authorization: `Bearer ${token}`,
      },
      fileList,
      beforeUpload: (file) => {
        this.setState(({ fileList }) => ({
          fileList: [file],
        }))
      },
      onRemove: (file) => {
        this.setState({
          fileList: [],
        })
      },
      onChange (info) {
        if (info.file.status !== 'uploading') {
          console.log(info.file, info.fileList)
        }
        if (info.file.status === 'done') {
          if (info.file.response.success) {
            message.success(`${info.fileList[0].name} file uploaded successfully`)
            dispatch({
              type: 'chainCode/listChainCodes',
            })
          }
        } else if (info.file.status === 'error') {
          message.error(`${info.fileList[0].name} file upload failed.`)
        }
      },
    }
    //disabled={['installed', 'instantiated'].indexOf(item.status) >= 0} disabled={['uploaded', 'instantiated'].indexOf(item.status) >= 0}
    function menu (item) {
      return (
        <Menu onClick={_that.clickMenu}>
          <Menu.Item  codeId={item.id} key="install">
            <FormattedMessage {...messages.button.install} />
          </Menu.Item>
          <Menu.Item codeId={item.id} key="instantiate">
            <FormattedMessage {...messages.button.instantiate} />
          </Menu.Item>
          <Menu.Item name={item.name} codeId={item.id} key="delete">
            <FormattedMessage {...messages.button.delete} />
          </Menu.Item>
        </Menu>
      )
    }

    const editModalProps = {
      visible: editModalVisible,
      name: currentChainCode ? currentChainCode.name : '',
      loading: editing,
      onCancel () {
        dispatch({
          type: 'chainCode/hideEditModal',
        })
      },
      onOk (data) {
        dispatch({
          type: 'chainCode/editChainCode',
          payload: {
            id: currentChainCode ? currentChainCode.id : '',
            ...data,
          },
        })
      },
    }

    const SHOW_PARENT = TreeSelect.SHOW_PARENT;
    const tProps = {
      treeData:peerTree,
      value: this.state.value,
      onChange: this.onSelectChange,
      treeCheckable: true,
      showCheckedStrategy: SHOW_PARENT,
      searchPlaceholder: 'Please select',
      style: {
        width: 300,
      },
    };

    const installModalProps = {
      visible: installModalVisible,
      chains: dbChains,
      subchains: subdbChains,
      loading: installing,
      tProps,
      onCancel () {
        dispatch({
          type: 'chainCode/hideInstallModal',
        })
      },
      onOk (data) {
        dispatch({
          type: 'chainCode/installChainCode',
          payload: {
            id: currentChainCode ? currentChainCode.id : '',
            name:currentChainCode ? currentChainCode.name : '',
            ...data,
          },
        })
      },
    }
    const instantiateModalProps = {
      visible: instantiateModalVisible,
      chains: dbChains,
      subchains: subdbChains,
      loading: installing,
      onCancel () {
        dispatch({
          type: 'chainCode/hideInstantiateModal',
        })
      },
      onOk (data) {
        dispatch({
          type: 'chainCode/instantiateChainCode',
          payload: {
            id: currentChainCode ? currentChainCode.id : '',
            ...data,
          },
        })
      },
    }

    return (
      <PageHeaderLayout>
        <div className={styles.cardList}>
          <List
            rowKey="id"
            grid={{ gutter: 24, lg: 3, md: 2, sm: 1, xs: 1,}}
            loading={loadingChainCodes}
            dataSource={['', ...chainCodes]}
            renderItem={item => (item ? (
              <List.Item key={item.id}>
                <Card hoverable
                  className={styles.card}
                  actions={[<Tooltip title={intl.formatMessage(messages.tooltip.edit)}><Icon onClick={() => this.onClickEdit(item)} type="edit" /></Tooltip>, <Dropdown overlay={menu(item)}>
                    <a className="ant-dropdown-link">
                      <Icon type="ellipsis" />
                    </a>
                                                                                                                                                              </Dropdown>]}
                >
                  <Card.Meta
                    title={<a className={styles.cardName}><Ellipsis length={30}>{item.name}</Ellipsis></a>}
                    avatar={
                      <Avatar size="large" className={styles.cardAvatar} icon="file-text" />
                    }
                    description={(
                      <Ellipsis className={styles.item} lines={3}>
                        {/*<p>*/}
                          {/*<Badge status={this.codeStatus(item.status)} text={intl.formatMessage(messages.status[item.status], { name: item.chainName })} />*/}
                        {/*</p>*/}
                        <p>
                          <Badge status={this.codeStatus(item.status)} text={intl.formatMessage(messages.status[item.status], { name: item.channelName })} />
                        </p>
                        {((item.status == 'installed') || (item.status == 'instantiated') ) &&
                          <p>
                            <Badge status={this.codeStatus(item.status)} text={intl.formatMessage(messages.label.version, { version: item.version })} />
                          </p>
                        }

                        <p>
                          {moment(item.uploadTime).format('YYYY-MM-DD HH:mm:ss')}
                        </p>
                      </Ellipsis>
                    )}
                  />
                </Card>
              </List.Item>
              ) : (
                <List.Item>
                  <Upload {...uploadProps}>
                    <Button type="dashed" className={styles.newButton}>
                      <Icon type="plus" /> <FormattedMessage {...messages.button.newSmartContract} />
                    </Button>
                  </Upload>
                </List.Item>
              )
            )}
          />
          {editModalVisible && <EditModal {...editModalProps} />}
          {installModalVisible && <InstallModal {...installModalProps} />}
          {instantiateModalVisible && <InstantiateModal {...instantiateModalProps} />}
        </div>
      </PageHeaderLayout>
    )
  }
}

export default injectIntl(SmartContract)
