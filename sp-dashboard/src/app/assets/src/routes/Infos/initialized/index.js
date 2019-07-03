/*
 SPDX-License-Identifier: Apache-2.0
*/
import React, { PureComponent } from 'react';
import { connect } from 'dva';
import { Button, Form, Popconfirm, Input, Table, Card, Menu, Dropdown, Icon, List, Badge, Col } from 'antd';

import PageHeaderLayout from '../../../layouts/PageHeaderLayout';
import { Select } from 'antd';

import styles from './index.less';

@connect(({ information, loading }) => ({
  information,
    loadingInformations: loading.effects['infos/fetchInitialized'],
}))
class Infos extends React.Component {

    componentDidMount() {
      this.props.dispatch({
        type: 'information/fetchInitialized',
      });
    };

    render() {
      const { information } = this.props;
      const {informations} = information;
      console.log('in route',informations);

        const formItemLayout = {
            labelCol: {
                xs: { span: 24 },
                sm: { span: 8 },
            },
            wrapperCol: {
                xs: { span: 24 },
                sm: { span: 16 },
            },
        };

        const tailFormItemLayout = {
            wrapperCol: {
                xs: {
                    span: 24,
                    offset: 0,
                },
                sm: {
                    span: 16,
                    offset: 8,
                },
            },
        };

        const { getFieldDecorator } = this.props.form;
        const { TextArea } = Input;
        
        function badgeStatus(status) {
          switch(status) {
            case 'initial':
              return 'initial';
            case 'no_initial':
              return 'not initial';
            default:
              break;
          }
        }
        const menu = () => (
          <Menu onClick={this.clickMore}>
            <Menu.Item key="start">
              {'start'}
            </Menu.Item>
            <Menu.Item key="restart">
              {'restart'}
            </Menu.Item>
            <Menu.Item key="stop">
              {'stop'}
            </Menu.Item>
            <Menu.Item key="delete">
              {'delete'}
            </Menu.Item>
          </Menu>
        );
        const MoreBtn = () => (
          <Dropdown overlay={menu}>
            <a>
              更多<Icon type='down'/>
            </a>
          </Dropdown>
        );
        const data = [{title: '组织名称', content:informations.sp_org_name},
          {title: '网络类型', content:informations.network_type}, 
          {title: '共识策略', content:informations.consensus_plugin},
          {title: '创建时间', content:informations.time}, 
          {title: '状态', content:informations.status}];

        return (
            <PageHeaderLayout>
              <Card title='组织信息' style={{marginTop:24}} actions={[<MoreBtn/>]}>
                <List dataSource={data}  renderItem={(item) => (
                   <Col span={8}>
                    <div>
                      <span>
                        {item.title}
                      </span>
                      <p>
                        {item.content}
                      </p>
                    </div>
                   </Col>
                  )}
                />
              </Card>
            </PageHeaderLayout>
        );
    }
}

export default Infos = Form.create()(Infos);