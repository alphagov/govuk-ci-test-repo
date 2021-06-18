RSpec.describe CoronavirusLandingPageController do
  include CoronavirusContentItemHelper

  describe "GET show" do
    before do
      stub_content_store_has_item("/coronavirus", coronavirus_content_item)
      stub_coronavirus_statistics
    end

    it "has a success response" do
      get :show
      expect(response).to have_http_status(:success)
    end

    it "sets a 5 minute cache header" do
      get :show
      expect(response.headers["Cache-Control"]).to eq("max-age=#{5.minutes}, public")
    end

    context "when coronavirus statistics are not available" do
      before { stub_request(:get, /coronavirus.data.gov.uk/).to_return(status: 500) }

      it "reduces the cache time to 30 seconds" do
        get :show
        expect(response.headers["Cache-Control"]).to eq("max-age=#{30.seconds}, public")
      end
    end

    context "when testing national_applicability" do
      it "loads the production content item in production environments" do
        allow(ContentItem).to receive(:find!).and_return(coronavirus_content_item)

        expect(CoronavirusTimelineNationsContentItem).to_not receive(:load)
        expect(ContentItem).to receive(:find!)

        get :show, params: { nation: "foo" }
      end

      it "loads the fixture file in other environments" do
        allow(Rails.env).to receive(:development?).and_return(true)
        allow(CoronavirusTimelineNationsContentItem).to receive(:load).and_return(coronavirus_content_item_with_timeline_national_applicability)

        expect(CoronavirusTimelineNationsContentItem).to receive(:load)
        expect(ContentItem).to_not receive(:find!)

        get :show, params: { nation: "foo" }
      end
    end
  end
end
