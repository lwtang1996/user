import React, { PureComponent } from 'react';
import {connect} from 'dva';
import PageHeaderLayout from '../../../layouts/PageHeaderLayout';
import { Form, Input, Table, Button } from 'antd';

@connect(({ channel }) => ({
  channel: channel,
}))
@Form.create()
export default class CreateChannel extends PureComponent {
  state = {
    submitting: false,
    selectedRows: [],
  };

  componentDidMount() {
    this.props.dispatch({
      type: 'channel/fetchOrgs',
    });
  };

  onSelectChange = (selectedRowKeys,selectedRows) => {
    this.setState({selectedRows});
    //console.log(this.state.selectedRows);
  };

  handleSubmit = e => {
    e.preventDefault();

    this.props.form.validateFields((err, values) => {
      if(!err){
        const dataSubmit = {values: values, selectRows: this.state.selectedRows};
        this.setState({submitting: true});
        this.props.dispatch({
          type: 'channel/createChannel',
          payload: {
            ...dataSubmit,
          }
        });
      }
    });
  }

  render() {
    const { getFieldDecorator } = this.props.form;
    const { channel } = this.props;
    const { orgs } = channel;
    //console.log('in route',orgs);

    const columns = [
      {
        title: '组织名称',
        dataIndex: 'orgname',
      },
      {
        title: '状态',
        dataIndex: 'orgstatus',
      }
    ];
    const data = orgs.map(function(item, index, arr) {
      item.key = index;
      return item;
    });
    const rowSelection = {
      onChange: this.onSelectChange,
    };

    return (
      <PageHeaderLayout>
        <Form onSubmit={this.handleSubmit}>
          <Form.Item label='通道名称'>
            {getFieldDecorator('channel_name', {
              rules: [{required:true, message:'please input channel name'}],
            })(<Input/>)}
          </Form.Item>
          <Form.Item>
            <Table rowSelection={rowSelection} columns={columns} dataSource={data} />
          </Form.Item>
          <Form.Item>
            <Button loading={this.state.submitting} type='primary' htmlType='submit'>创建通道</Button>
          </Form.Item>
        </Form>
      </PageHeaderLayout>
    );
  }
}